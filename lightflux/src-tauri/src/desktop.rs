use serde::{Deserialize, Serialize};
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::PathBuf,
    sync::Mutex,
};
use tauri::{
    image::Image,
    menu::{Menu, MenuBuilder, MenuItem, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime, State, Window, WindowEvent, Wry,
};

const TRAY_ID: &str = "lightflux-menu-bar";
const TRAY_ACTION_EVENT: &str = "lightflux://tray-action";
const AUTH_TOKEN_FILE: &str = "auth-session";

const TRAY_ICON: &[u8] = include_bytes!("../icons/tray-default/36x36.png");
const TRAY_UPDATE_ICON: &[u8] = include_bytes!("../icons/tray-update/36x36.png");

#[cfg(target_os = "macos")]
const DOCK_ICON_FLUX: &[u8] = include_bytes!("../icons/dock-flux/512x512.png");
#[cfg(target_os = "macos")]
const DOCK_ICON_PAPER: &[u8] = include_bytes!("../icons/dock-paper/512x512.png");
#[cfg(target_os = "macos")]
const DOCK_ICON_GRAPHITE: &[u8] = include_bytes!("../icons/dock-graphite/512x512.png");

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopPreferences {
    pub dock_badge: String,
    pub dock_icon: String,
    pub dock_visibility: String,
    pub close_behavior: String,
}

impl Default for DesktopPreferences {
    fn default() -> Self {
        Self {
            dock_badge: "today".into(),
            dock_icon: "flux".into(),
            dock_visibility: "always".into(),
            close_behavior: "hide".into(),
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopStatus {
    pub badge_count: Option<i64>,
    pub language: Option<String>,
    pub overdue_count: usize,
    pub today_count: usize,
    pub update_ready: bool,
    pub update_version: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopEnvironment {
    pub current_version: String,
    pub is_desktop: bool,
    pub is_macos: bool,
    pub updater_configured: bool,
}

#[derive(Clone)]
struct TrayMenuItems {
    summary: MenuItem<Wry>,
    new_task: MenuItem<Wry>,
    today: MenuItem<Wry>,
    milestones: MenuItem<Wry>,
    update: MenuItem<Wry>,
    show: MenuItem<Wry>,
    settings: MenuItem<Wry>,
    quit: MenuItem<Wry>,
}

pub struct DesktopState {
    preferences: Mutex<DesktopPreferences>,
    status: Mutex<DesktopStatus>,
    tray: Mutex<Option<TrayIcon>>,
    tray_items: Mutex<Option<TrayMenuItems>>,
}

impl Default for DesktopState {
    fn default() -> Self {
        Self {
            preferences: Mutex::new(DesktopPreferences::default()),
            status: Mutex::new(DesktopStatus::default()),
            tray: Mutex::new(None),
            tray_items: Mutex::new(None),
        }
    }
}

fn updater_configured() -> bool {
    option_env!("LIGHTFLUX_UPDATER_PUBLIC_KEY")
        .map(str::trim)
        .is_some_and(|value| !value.is_empty())
}

fn tray_image(update_available: bool) -> tauri::Result<Image<'static>> {
    Image::from_bytes(if update_available {
        TRAY_UPDATE_ICON
    } else {
        TRAY_ICON
    })
}

fn localized<'a>(language: Option<&str>, chinese: &'a str, english: &'a str) -> &'a str {
    if language == Some("en") {
        english
    } else {
        chinese
    }
}

fn tray_summary(status: &DesktopStatus) -> String {
    let language = status.language.as_deref();
    if language == Some("en") {
        format!(
            "Today: {} pending · {} overdue",
            status.today_count, status.overdue_count
        )
    } else {
        format!(
            "今天：{} 项待办 · {} 项延期",
            status.today_count, status.overdue_count
        )
    }
}

fn update_menu_text(status: &DesktopStatus) -> String {
    let language = status.language.as_deref();
    match (&status.update_version, status.update_ready, language) {
        (Some(version), true, Some("en")) => format!("Restart to finish {version}…"),
        (Some(version), true, _) => format!("重启并完成 {version}…"),
        (Some(version), false, Some("en")) => format!("Update to {version}…"),
        (Some(version), false, _) => format!("更新到 {version}…"),
        (None, _, Some("en")) => "No update available".into(),
        (None, _, _) => "暂无可用更新".into(),
    }
}

fn build_tray_menu(
    app: &AppHandle,
    status: &DesktopStatus,
) -> tauri::Result<(Menu<Wry>, TrayMenuItems)> {
    let language = status.language.as_deref();
    let summary = tray_summary(status);
    let summary_item = MenuItemBuilder::with_id("summary", summary)
        .enabled(false)
        .build(app)?;
    let new_task = MenuItemBuilder::with_id(
        "new-task",
        localized(language, "快速新建任务…", "Quick add task…"),
    )
    .accelerator("CmdOrCtrl+N")
    .build(app)?;
    let today =
        MenuItemBuilder::with_id("today", localized(language, "打开今日安排", "Open Today"))
            .build(app)?;
    let milestones = MenuItemBuilder::with_id(
        "milestones",
        localized(language, "打开重要节点", "Open Milestones"),
    )
    .build(app)?;
    let show = MenuItemBuilder::with_id(
        "show",
        localized(language, "显示 LightFlux", "Show LightFlux"),
    )
    .build(app)?;
    let settings = MenuItemBuilder::with_id("settings", localized(language, "设置…", "Settings…"))
        .accelerator("CmdOrCtrl+,")
        .build(app)?;
    let update = MenuItemBuilder::with_id("update", update_menu_text(status))
        .enabled(status.update_version.is_some())
        .build(app)?;
    let quit = MenuItemBuilder::with_id(
        "quit",
        localized(language, "退出 LightFlux", "Quit LightFlux"),
    )
    .accelerator("CmdOrCtrl+Q")
    .build(app)?;

    let builder = MenuBuilder::new(app)
        .item(&summary_item)
        .separator()
        .item(&new_task)
        .separator()
        .item(&today)
        .item(&milestones)
        .separator()
        .item(&update);

    let menu = builder
        .separator()
        .item(&show)
        .item(&settings)
        .separator()
        .item(&quit)
        .build()?;
    Ok((
        menu,
        TrayMenuItems {
            summary: summary_item,
            new_task,
            today,
            milestones,
            update,
            show,
            settings,
            quit,
        },
    ))
}

fn dock_should_be_visible(preferences: &DesktopPreferences, window_visible: bool) -> bool {
    match preferences.dock_visibility.as_str() {
        "hidden" => false,
        "window-open" => window_visible,
        _ => true,
    }
}

#[cfg(target_os = "macos")]
fn set_macos_dock_icon(style: &str) -> Result<(), String> {
    use objc2::{AllocAnyThread, MainThreadMarker};
    use objc2_app_kit::{NSApplication, NSImage};
    use objc2_foundation::NSData;

    let bytes = match style {
        "paper" => DOCK_ICON_PAPER,
        "graphite" => DOCK_ICON_GRAPHITE,
        _ => DOCK_ICON_FLUX,
    };
    let marker = MainThreadMarker::new()
        .ok_or_else(|| "Dock icon updates must run on the main thread.".to_string())?;
    let application = NSApplication::sharedApplication(marker);
    let data = NSData::with_bytes(bytes);
    let image = NSImage::initWithData(NSImage::alloc(), &data)
        .ok_or_else(|| "Unable to decode the Dock icon.".to_string())?;
    unsafe {
        application.setApplicationIconImage(Some(&image));
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn set_macos_dock_icon(_style: &str) -> Result<(), String> {
    Ok(())
}

fn apply_preferences<R: Runtime>(
    app: &AppHandle<R>,
    preferences: &DesktopPreferences,
    window_visible: bool,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        app.set_dock_visibility(dock_should_be_visible(preferences, window_visible))
            .map_err(|error| error.to_string())?;
        let style = preferences.dock_icon.clone();
        app.run_on_main_thread(move || {
            if let Err(error) = set_macos_dock_icon(&style) {
                eprintln!("{error}");
            }
        })
        .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let preferences = app
        .try_state::<DesktopState>()
        .and_then(|state| state.preferences.lock().ok().map(|value| value.clone()))
        .unwrap_or_default();
    #[cfg(target_os = "macos")]
    if preferences.dock_visibility == "window-open" {
        let _ = app.set_dock_visibility(true);
    }
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn emit_tray_action<R: Runtime>(app: &AppHandle<R>, action: &str) {
    show_main_window(app);
    let _ = app.emit(TRAY_ACTION_EVENT, action);
}

fn refresh_tray(state: &DesktopState) -> Result<(), String> {
    let status = state
        .status
        .lock()
        .map_err(|_| "Desktop status is unavailable.".to_string())?
        .clone();
    let items = state
        .tray_items
        .lock()
        .map_err(|_| "Menu bar items are unavailable.".to_string())?
        .clone();
    if let Some(items) = items {
        let language = status.language.as_deref();
        items
            .summary
            .set_text(tray_summary(&status))
            .map_err(|error| error.to_string())?;
        items
            .new_task
            .set_text(localized(language, "快速新建任务…", "Quick add task…"))
            .map_err(|error| error.to_string())?;
        items
            .today
            .set_text(localized(language, "打开今日安排", "Open Today"))
            .map_err(|error| error.to_string())?;
        items
            .milestones
            .set_text(localized(language, "打开重要节点", "Open Milestones"))
            .map_err(|error| error.to_string())?;
        items
            .update
            .set_text(update_menu_text(&status))
            .map_err(|error| error.to_string())?;
        items
            .update
            .set_enabled(status.update_version.is_some())
            .map_err(|error| error.to_string())?;
        items
            .show
            .set_text(localized(language, "显示 LightFlux", "Show LightFlux"))
            .map_err(|error| error.to_string())?;
        items
            .settings
            .set_text(localized(language, "设置…", "Settings…"))
            .map_err(|error| error.to_string())?;
        items
            .quit
            .set_text(localized(language, "退出 LightFlux", "Quit LightFlux"))
            .map_err(|error| error.to_string())?;
    }
    let tray = state
        .tray
        .lock()
        .map_err(|_| "Menu bar state is unavailable.".to_string())?;
    if let Some(tray) = tray.as_ref() {
        tray.set_icon_with_as_template(
            Some(tray_image(status.update_version.is_some()).map_err(|error| error.to_string())?),
            true,
        )
        .map_err(|error| error.to_string())?;
    }
    Ok(())
}

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let state = DesktopState::default();

    #[cfg(target_os = "macos")]
    {
        let initial_status = state.status.lock().unwrap().clone();
        let (menu, items) = build_tray_menu(app.handle(), &initial_status)?;
        let tray = TrayIconBuilder::with_id(TRAY_ID)
            .icon(tray_image(false)?)
            .icon_as_template(true)
            .tooltip(app.config().product_name.as_deref().unwrap_or("LightFlux"))
            .menu(&menu)
            .show_menu_on_left_click(false)
            .on_menu_event(|app, event| match event.id().as_ref() {
                "new-task" | "today" | "milestones" | "settings" | "update" => {
                    emit_tray_action(app, event.id().as_ref())
                }
                "show" => show_main_window(app),
                "quit" => {
                    let _ = app.emit(TRAY_ACTION_EVENT, "quit");
                }
                _ => {}
            })
            .on_tray_icon_event(|tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    show_main_window(tray.app_handle());
                }
            })
            .build(app)?;
        *state.tray.lock().unwrap() = Some(tray);
        *state.tray_items.lock().unwrap() = Some(items);
    }

    app.manage(state);
    Ok(())
}

pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    let WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };
    let Some(state) = window.app_handle().try_state::<DesktopState>() else {
        return;
    };
    let preferences = state
        .preferences
        .lock()
        .map(|value| value.clone())
        .unwrap_or_default();

    #[cfg(target_os = "macos")]
    {
        api.prevent_close();
        if preferences.close_behavior == "quit" {
            let _ = window.app_handle().emit(TRAY_ACTION_EVENT, "quit");
            return;
        }
        let _ = window.hide();
        if preferences.dock_visibility == "window-open" {
            let _ = window.app_handle().set_dock_visibility(false);
        }
    }
}

#[tauri::command]
pub fn desktop_environment(app: AppHandle) -> DesktopEnvironment {
    DesktopEnvironment {
        current_version: app.package_info().version.to_string(),
        is_desktop: true,
        is_macos: cfg!(target_os = "macos"),
        updater_configured: updater_configured(),
    }
}

#[tauri::command]
pub fn apply_desktop_preferences(
    app: AppHandle,
    state: State<'_, DesktopState>,
    preferences: DesktopPreferences,
) -> Result<(), String> {
    let window_visible = app
        .get_webview_window("main")
        .and_then(|window| window.is_visible().ok())
        .unwrap_or(true);
    apply_preferences(&app, &preferences, window_visible)?;
    *state
        .preferences
        .lock()
        .map_err(|_| "Desktop preferences are unavailable.".to_string())? = preferences;
    Ok(())
}

#[tauri::command]
pub fn update_desktop_status(
    app: AppHandle,
    state: State<'_, DesktopState>,
    status: DesktopStatus,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_badge_count(status.badge_count)
            .map_err(|error| error.to_string())?;
    }
    *state
        .status
        .lock()
        .map_err(|_| "Desktop status is unavailable.".to_string())? = status;
    refresh_tray(&state)
}

#[tauri::command]
pub fn quit_desktop(app: AppHandle) {
    app.exit(0);
}

fn auth_token_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join(AUTH_TOKEN_FILE))
}

#[tauri::command]
pub fn load_desktop_auth_token(app: AppHandle) -> Result<Option<String>, String> {
    let path = auth_token_path(&app)?;
    match fs::read_to_string(path) {
        Ok(token) if !token.trim().is_empty() => Ok(Some(token.trim().to_string())),
        Ok(_) => Ok(None),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
pub fn store_desktop_auth_token(app: AppHandle, token: Option<String>) -> Result<(), String> {
    let path = auth_token_path(&app)?;
    let Some(token) = token else {
        return match fs::remove_file(path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => Err(error.to_string()),
        };
    };
    if token.is_empty()
        || token.len() > 2048
        || !token
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "-_.".contains(character))
    {
        return Err("Invalid desktop authentication token.".into());
    }

    let mut options = OpenOptions::new();
    options.create(true).truncate(true).write(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(path).map_err(|error| error.to_string())?;
    file.write_all(token.as_bytes())
        .map_err(|error| error.to_string())?;
    file.sync_all().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn export_app_state_backup(
    app: AppHandle,
    content: String,
    filename: String,
) -> Result<String, String> {
    if !filename.starts_with("lightflux-backup-")
        || !filename.ends_with(".json")
        || !filename
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || ".-_".contains(character))
    {
        return Err("Invalid backup filename.".into());
    }
    let mut path = app
        .path()
        .download_dir()
        .map_err(|error| error.to_string())?;
    path.push(filename);
    fs::write(&path, content).map_err(|error| error.to_string())?;
    Ok(path.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::{tray_summary, update_menu_text, DesktopStatus};

    #[test]
    fn tray_summary_uses_the_selected_language() {
        let chinese = DesktopStatus {
            overdue_count: 2,
            today_count: 5,
            ..DesktopStatus::default()
        };
        let english = DesktopStatus {
            language: Some("en".into()),
            overdue_count: 2,
            today_count: 5,
            ..DesktopStatus::default()
        };

        assert_eq!(tray_summary(&chinese), "今天：5 项待办 · 2 项延期");
        assert_eq!(tray_summary(&english), "Today: 5 pending · 2 overdue");
    }

    #[test]
    fn update_menu_text_reflects_download_state() {
        let available = DesktopStatus {
            language: Some("en".into()),
            update_version: Some("1.2.0".into()),
            ..DesktopStatus::default()
        };
        let ready = DesktopStatus {
            update_ready: true,
            ..available.clone()
        };

        assert_eq!(update_menu_text(&available), "Update to 1.2.0…");
        assert_eq!(update_menu_text(&ready), "Restart to finish 1.2.0…");
        assert_eq!(
            update_menu_text(&DesktopStatus::default()),
            "暂无可用更新"
        );
    }
}
