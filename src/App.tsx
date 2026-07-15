import { useEffect, useMemo, useRef } from 'react'
import { MdEditor, MdPreview, NormalToolbar } from 'md-editor-rt'
import 'md-editor-rt/lib/style.css'
import '@vavt/rt-extension/lib/asset/style.css'
import { FileText, Plus, X } from 'lucide-react'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { basename } from '@tauri-apps/api/path'
import { listen } from '@tauri-apps/api/event'
import { getMatches } from '@tauri-apps/plugin-cli'
import { useDocumentStore } from './store/useDocumentStore'
import './App.css'

function App() {
  const store = useDocumentStore()
  const activeDoc = useMemo(
    () => store.documents.find((d) => d.id === store.activeId) || null,
    [store.documents, store.activeId],
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

  const openDocument = async (filePath: string) => {
    if (!filePath) return
    const normalizedPath = filePath.toLowerCase()
    const existing = useDocumentStore
      .getState()
      .documents.find((d) => d.filePath?.toLowerCase() === normalizedPath)
    if (existing) {
      useDocumentStore.getState().setActiveDocument(existing.id)
      return
    }
    const content = await readTextFile(filePath)
    const name = await basename(filePath)
    useDocumentStore.getState().addDocument(name, content)
    const newDoc = useDocumentStore.getState().documents.at(-1)
    if (newDoc) {
      useDocumentStore.getState().markSaved(newDoc.id, name, filePath)
      useDocumentStore.getState().setActiveDocument(newDoc.id)
    }
  }

  useEffect(() => {
    if (!isTauri()) {
      if (useDocumentStore.getState().documents.length === 0) {
        useDocumentStore.getState().addDocument()
      }
      return
    }
    getMatches()
      .then(async (matches) => {
        const fileArg = matches.args.file?.value
        if (typeof fileArg === 'string') {
          await openDocument(fileArg)
        } else if (useDocumentStore.getState().documents.length === 0) {
          useDocumentStore.getState().addDocument()
        }
      })
      .catch(() => {
        if (useDocumentStore.getState().documents.length === 0) {
          useDocumentStore.getState().addDocument()
        }
      })

    const unlisten = listen<string>('open-file', (event) => {
      openDocument(event.payload)
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(store.theme)
  }, [store.theme])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault()
          store.addDocument()
          break
        case 'o':
          e.preventDefault()
          handleOpen()
          break
        case 's':
          e.preventDefault()
          if (activeDoc) handleSave(activeDoc.id)
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeDoc, store.documents])

  const handleNew = () => {
    store.addDocument()
  }

  const handleOpen = async () => {
    try {
      if (!isTauri()) {
        fileInputRef.current?.click()
        return
      }
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Markdown 文件', extensions: ['md', 'markdown', 'mdx'] }],
      })
      if (typeof selected !== 'string') return
      await openDocument(selected)
    } catch {
      fileInputRef.current?.click()
    }
  }

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await file.text()
    const existing = useDocumentStore
      .getState()
      .documents.find((d) => d.title === file.name && !d.filePath)
    if (existing) {
      useDocumentStore.getState().setActiveDocument(existing.id)
      return
    }
    useDocumentStore.getState().addDocument(file.name, content)
    const newDoc = useDocumentStore.getState().documents.at(-1)
    if (newDoc) {
      useDocumentStore.getState().markSaved(newDoc.id, file.name)
      useDocumentStore.getState().setActiveDocument(newDoc.id)
    }
    e.target.value = ''
  }

  const handleSave = async (id: string) => {
    const doc = store.documents.find((d) => d.id === id)
    if (!doc) return
    try {
      let filePath = doc.filePath
      if (!filePath) {
        filePath = (await save({
          defaultPath: doc.title,
          filters: [{ name: 'Markdown 文件', extensions: ['md', 'markdown', 'mdx'] }],
        })) ?? undefined
      }
      if (!filePath) return
      await writeTextFile(filePath, doc.content)
      const name = await basename(filePath)
      store.markSaved(id, name, filePath)
    } catch {
      const blob = new Blob([doc.content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.title
      a.click()
      URL.revokeObjectURL(url)
      store.markSaved(id, doc.title)
    }
  }

  const toggleTheme = () => {
    store.setTheme(store.theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="tab-bar">
          {store.documents.map((doc) => (
            <div
              key={doc.id}
              className={`tab ${doc.id === store.activeId ? 'active' : ''}`}
              onClick={() => store.setActiveDocument(doc.id)}
            >
              <FileText size={14} />
              <span className="tab-title">
                {doc.title}
                {doc.isDirty && <sup className="dirty-dot">*</sup>}
              </span>
              <button
                type="button"
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  store.closeDocument(doc.id)
                }}
                title="关闭"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          <button type="button" className="tab-add" onClick={handleNew} title="新建文件">
            <Plus size={16} />
          </button>
        </div>

        <div className="toolbar"></div>
      </header>

      <div className="editor-shell">
        <div className="editor-stage">
          {activeDoc ? (
            activeDoc.mode === 'preview' ? (
              <MdPreview
                id={activeDoc.id}
                value={activeDoc.content}
                theme={store.theme}
                language="zh-CN"
                previewTheme="github"
                showCodeRowNumber
                className="minimd-preview"
              />
            ) : (
              <MdEditor
                id={activeDoc.id}
                modelValue={activeDoc.content}
                onChange={(v) => store.updateContent(activeDoc.id, v)}
                theme={store.theme}
                language="zh-CN"
                previewTheme="github"
                preview={activeDoc.mode === 'split'}
                showCodeRowNumber
                className="minimd-editor"
                placeholder="在此输入 Markdown 内容..."
                onSave={() => handleSave(activeDoc.id)}
                toolbars={[
                  0,
                  'save',
                  'bold',
                  'underline',
                  'italic',
                  '-',
                  'title',
                  'strikeThrough',
                  'sub',
                  'sup',
                  'quote',
                  'unorderedList',
                  'orderedList',
                  'task',
                  '-',
                  'codeRow',
                  'code',
                  'link',
                  'image',
                  'table',
                  'mermaid',
                  'katex',
                  '-',
                  'revoke',
                  'next',
                  '-',
                  'prettier',
                  '-',
                  // 2,
                  '=',
                  'htmlPreview',
                  'preview',
                  // '-',
                  // 3,
                  '-',
                  'catalog',
                  1,
                ]}
                defToolbars={[
                  <NormalToolbar
                    key="open-doc"
                    title="打开文件"
                    onClick={handleOpen}
                    trigger={
                      <svg
                        className="md-editor-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.89a2 2 0 0 1 1.66.9l.82 1.2H20a2 2 0 0 1 2 2v2" />
                      </svg>
                    }
                  />,
                  // <Emoji key="emoji" theme={store.theme} />,
                  // <ExportPDF
                  //   key="export-pdf"
                  //   theme={store.theme}
                  //   value={activeDoc.content}
                  // />,
                  <NormalToolbar
                    key="theme-switch"
                    title={store.theme === 'light' ? '切换暗色主题' : '切换亮色主题'}
                    onClick={toggleTheme}
                    trigger={
                      <svg
                        className="md-editor-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        {store.theme === 'light' ? (
                          <>
                            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                          </>
                        ) : (
                          <>
                            <circle cx="12" cy="12" r="4" />
                            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                          </>
                        )}
                      </svg>
                    }
                  />,
                ]}
              />
            )
          ) : (
            <div className="empty-state">
              <FileText size={48} strokeWidth={1.2} />
              <p>暂无打开的文档</p>
              <button type="button" className="primary-btn" onClick={handleNew}>
                新建文档
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.mdx,text/markdown"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default App
