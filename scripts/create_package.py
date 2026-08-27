import zipfile
import os
import json
import sys

def create_package():
    with open('projects/app/version.json', 'r', encoding='utf-8') as f:
        version = json.load(f)['version']

    expected_version = os.environ.get('EXPECTED_VERSION')
    if expected_version and expected_version.startswith('v'):
        expected_version = expected_version[1:]
    if not expected_version and os.environ.get('GITHUB_REF', '').startswith('refs/tags/v'):
        expected_version = os.environ['GITHUB_REF'].replace('refs/tags/v', '')

    if expected_version and expected_version != version:
        print(f"Error: Expected version '{expected_version}' does not match projects/app/version.json version '{version}'.")
        sys.exit(1)

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
