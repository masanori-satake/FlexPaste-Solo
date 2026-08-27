import zipfile
import os
import json

def create_package():
    with open('projects/app/version.json', 'r', encoding='utf-8') as f:
        version = json.load(f)['version']

    output_filename = f"FlexPaste-Solo-v{version}.zip"
    os.makedirs('releases', exist_ok=True)

    zip_path = os.path.join('releases', output_filename)
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('projects/app'):
            for file in files:
                filepath = os.path.join(root, file)
                arcname = os.path.relpath(filepath, 'projects/app')
                if arcname == 'manifest.chrome.json':
                    arcname = 'manifest.json'
                arcname = arcname.replace(os.path.sep, '/')
                zipf.write(filepath, arcname)

    print(f"Created package: {output_filename}")

if __name__ == "__main__":
    create_package()
