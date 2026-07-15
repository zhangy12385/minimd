import { create } from 'zustand'

export type ViewMode = 'edit' | 'preview' | 'split'

export interface Document {
  id: string
  title: string
  content: string
  isDirty: boolean
  mode: ViewMode
  filePath?: string
}

interface DocumentState {
  documents: Document[]
  activeId: string | null
  theme: 'light' | 'dark'
  addDocument: (title?: string, content?: string) => void
  closeDocument: (id: string) => void
  setActiveDocument: (id: string) => void
  updateContent: (id: string, content: string) => void
  setMode: (id: string, mode: ViewMode) => void
  setTheme: (theme: 'light' | 'dark') => void
  markSaved: (id: string, title?: string, filePath?: string) => void
}

const defaultContent = ``

let idCounter = 1

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  activeId: null,
  theme: 'light',

  addDocument: (title, content) => {
    const id = `doc-${Date.now()}-${idCounter++}`
    const doc: Document = {
      id,
      title: title ?? `未命名 ${idCounter - 1}.md`,
      content: content ?? defaultContent,
      isDirty: false,
      mode: 'split',
    }
    set({ documents: [...get().documents, doc], activeId: id })
  },

  closeDocument: (id) => {
    const docs = get().documents
    const idx = docs.findIndex((d) => d.id === id)
    const remaining = docs.filter((d) => d.id !== id)
    const nextActive = remaining.length
      ? remaining[Math.min(idx, remaining.length - 1)].id
      : null
    set({ documents: remaining, activeId: nextActive })
  },

  setActiveDocument: (id) => set({ activeId: id }),

  updateContent: (id, content) => {
    set({
      documents: get().documents.map((d) =>
        d.id === id ? { ...d, content, isDirty: true } : d,
      ),
    })
  },

  setMode: (id, mode) => {
    set({
      documents: get().documents.map((d) => (d.id === id ? { ...d, mode } : d)),
    })
  },

  setTheme: (theme) => set({ theme }),

  markSaved: (id, title, filePath) => {
    set({
      documents: get().documents.map((d) =>
        d.id === id ? { ...d, isDirty: false, title: title ?? d.title, filePath } : d,
      ),
    })
  },
}))
