import json
import sys
import os
import re
import subprocess

def get_current_version():
    with open('package.json', 'r', encoding='utf-8') as f:
        pkg = json.load(f)
        return pkg['version']

def check_consistency():
    pkg_version = get_current_version()

    lock_version = None
    if os.path.exists('package-lock.json'):
        with open('package-lock.json', 'r', encoding='utf-8') as f:
            lock = json.load(f)
            lock_version = lock.get('version')

    with open('projects/app/version.json', 'r', encoding='utf-8') as f:
        ver_file = json.load(f)
        ver_file_version = ver_file.get('version')

    manifest_version = None
    if os.path.exists('projects/app/manifest.json'):
        with open('projects/app/manifest.json', 'r', encoding='utf-8') as f:
            manifest = json.load(f)
            manifest_version = manifest.get('version')

    readme_version = None
    if os.path.exists('README.md'):
        with open('README.md', 'r', encoding='utf-8') as f:
            content = f.read()
            match = re.search(r'Version:\s*(\d+\.\d+\.\d+)', content)
            if not match:
                match = re.search(r'version-(\d+\.\d+\.\d+)-blue', content)
            if match:
                readme_version = match.group(1)

    checks = {
        'package.json': pkg_version,
        'version.json': ver_file_version,
        'manifest.json': manifest_version,
    }

    if lock_version is not None:
        checks['package-lock.json'] = lock_version
    if readme_version is not None:
        checks['README.md'] = readme_version

    mismatches = [k for k, v in checks.items() if v != pkg_version]

    if not mismatches:
        print(f"Version consistency check passed: {pkg_version}")
        return True
    else:
        print("Version mismatch!")
        for k, v in checks.items():
            print(f"  {k}: {v}")
        return False

def check_version_bump():
    try:
        base_ref = os.environ.get('GITHUB_BASE_REF') or os.environ.get('BEFORE_SHA') or os.environ.get('BASE_SHA') or os.environ.get('COMPARE_REF')
        if not base_ref or base_ref == '0000000000000000000000000000000000000000':
            try:
                subprocess.check_output(['git', 'rev-parse', '--verify', 'HEAD~1'], stderr=subprocess.STDOUT)
                base_ref = 'HEAD~1'
            except Exception:
                return True

        try:
            changed_files = subprocess.check_output(
                ['git', 'diff', '--name-only', base_ref],
                stderr=subprocess.STDOUT
            ).decode('utf-8').splitlines()
        except subprocess.CalledProcessError as e:
            print(f"Git diff failed: {e}")
            return False

        source_changed = any(
            f.startswith('projects/app/')
            for f in changed_files
        )

        if not source_changed:
            return True

        try:
            old_pkg_json = subprocess.check_output(
                ['git', 'show', f'{base_ref}:package.json'],
                stderr=subprocess.STDOUT
            ).decode('utf-8')
            old_version = json.loads(old_pkg_json)['version']
        except Exception:
            return True

        current_version = get_current_version()
        if current_version == old_version:
            print(f"Error: Source files in 'projects/app/' were modified, but version remains at {current_version}.")
            print("Please run 'npm run version:bump' to increment the version.")
            return False

        return True
    except Exception as e:
        print(f"Error checking version bump: {e}")
        return False

if __name__ == "__main__":
    if not check_consistency():
        sys.exit(1)

    if not check_version_bump():
        sys.exit(1)
