from pathlib import Path
import hashlib, json, shutil, subprocess, sys

HERE = Path(__file__).resolve().parent
PART = json.loads((HERE / 'part.json').read_text())
MANIFEST = json.loads((HERE / 'manifest.json').read_text())
REMOTE = 'https://github.com/yashpanpaliya11/Major_Project_Sem3.git'

def git(repo, *args):
    return subprocess.check_output(['git', *args], cwd=repo, text=True).strip()

def main():
    if len(sys.argv) != 2: raise SystemExit('Usage: python3 apply.py /path/to/Major_Project_Sem3')
    repo = Path(sys.argv[1]).resolve()
    if not (repo / '.git').exists(): raise SystemExit('Not a Git checkout.')
    if git(repo, 'remote', 'get-url', 'origin').rstrip('/') != REMOTE: raise SystemExit('Unexpected origin remote.')
    if git(repo, 'branch', '--show-current') != 'main': raise SystemExit('Check out main first.')
    if git(repo, 'status', '--porcelain'): raise SystemExit('Working tree must be clean.')
    subprocess.run(['git', 'fetch', 'origin', 'main'], cwd=repo, check=True)
    if git(repo, 'rev-parse', 'HEAD') != git(repo, 'rev-parse', 'origin/main'): raise SystemExit('Pull latest main first.')
    number = PART['number']
    entry = MANIFEST['files'][number - 1]
    target = repo / '_next_app' / entry['path']
    if target.exists(): raise SystemExit('Part already applied or target exists.')
    source = HERE / 'payload' / entry['path']
    if hashlib.sha256(source.read_bytes()).hexdigest() != entry['sha256']: raise SystemExit('Payload checksum mismatch.')
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    message = 'Stage final app: ' + entry['path']
    subprocess.run(['git', 'add', '-A'], cwd=repo, check=True)
    subprocess.run(['git', 'diff', '--cached', '--check'], cwd=repo, check=True)
    subprocess.run(['git', 'commit', '-m', message], cwd=repo, check=True)
    subprocess.run(['git', 'push', 'origin', 'main'], cwd=repo, check=True)
    print('Part applied and pushed:', number)

if __name__ == '__main__': main()
