use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
      let _ = app.get_webview_window("main")
        .expect("no main window")
        .set_focus();
      if let Some(path) = args.iter().find(|a| {
        let lower = a.to_lowercase();
        lower.ends_with(".md") || lower.ends_with(".markdown") || lower.ends_with(".mdx")
      }) {
        let _ = app.emit("open-file", path);
      }
    }))
    .plugin(tauri_plugin_cli::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_deep_link::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
