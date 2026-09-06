import os
import sys

app_dir = r"c:\Users\Marcus\OneDrive\Desktop\app garimpo leilao\app-marcus-main\app-marcus-main"
vbs_path = os.path.join(app_dir, "launch_app.vbs")
ico_path = os.path.join(app_dir, "app_icon.ico")
desktop_dir = os.path.expanduser(r"~\Desktop")
if not os.path.exists(desktop_dir) or "OneDrive" in app_dir:
    desktop_dir = r"C:\Users\Marcus\OneDrive\Desktop"

with open(vbs_path, "r", encoding="utf-8") as f:
    vbs_code = f.read()
print(f"Created {vbs_path}")

# Create Shortcut via VBScript or powershell
shortcut_path = os.path.join(desktop_dir, "Marcus - Assessoria Imobiliaria.lnk")
helper_vbs = os.path.join(app_dir, "create_lnk.vbs")

helper_code = f'''Set WshShell = CreateObject("WScript.Shell")
Set shortcut = WshShell.CreateShortcut("{shortcut_path}")
shortcut.TargetPath = "wscript.exe"
shortcut.Arguments = """{vbs_path}"""
shortcut.WorkingDirectory = "{app_dir}"
shortcut.IconLocation = "{ico_path}, 0"
shortcut.Description = "Marcus Assessoria Imobiliária & Garimpo de Leilões"
shortcut.Save
'''

with open(helper_vbs, "w", encoding="utf-8") as f:
    f.write(helper_code)

os.system(f'cscript //nologo "{helper_vbs}"')
if os.path.exists(helper_vbs):
    os.remove(helper_vbs)

print(f"Shortcut successfully created at: {shortcut_path}")
