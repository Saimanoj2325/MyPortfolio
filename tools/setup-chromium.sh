#!/bin/sh
# Headless Chromium for ARM64 Linux sandboxes where Playwright's own download is unavailable.
# Pulls Debian trixie's chromium-headless-shell + missing libs into /tmp/chr (no root needed),
# and writes /tmp/chr/chrome-ns.sh, which runs it in a user namespace with a patched
# /proc/cpuinfo: some ARM hosts (Neoverse-V2) report a CPU whose SVE is hidden, so LLVM inside
# SwiftShader JIT-compiles SVE instructions and the GPU process dies with SIGILL.
# Usage: sh tools/setup-chromium.sh   then   CHROME=/tmp/chr/chrome-ns.sh node tools/smoke.mjs <url>
set -e
D=/tmp/chr
mkdir -p $D && cd $D
[ -f Packages.xz ] || curl -s -o Packages.xz http://deb.debian.org/debian/dists/trixie/main/binary-arm64/Packages.xz
[ -f pk.json ] || python3 - <<'EOF'
import re, json, lzma
raw = open('Packages.xz', 'rb').read()
d = {}
for b in lzma.decompress(raw).decode().split('\n\n'):
    m = re.search(r'^Package: (.+)$', b, re.M)
    if m: d[m.group(1)] = b
json.dump(d, open('pk.json', 'w'))
EOF
python3 - <<'EOF'
import json, re, subprocess, os
d = json.load(open('pk.json'))
pkgs = ['chromium-headless-shell', 'chromium-common', 'libopenh264-8', 'libatk1.0-0t64', 'libdouble-conversion3', 'libxcomposite1',
        'libxdamage1', 'libharfbuzz-subset0', 'libxnvctrl0', 'libatspi2.0-0t64', 'libminizip1t64']
for p in pkgs:
    f = re.search(r'^Filename: (.+)$', d[p], re.M).group(1)
    out = os.path.basename(f)
    if not os.path.exists(out):
        subprocess.run(['curl', '-s', '-o', out, 'http://deb.debian.org/debian/' + f], check=True)
    subprocess.run(['dpkg-deb', '-x', out, 'root'], check=True)
EOF
sed -E 's/^(CPU part\s*:\s*)0xd4f/\10xd0c/' /proc/cpuinfo > $D/cpuinfo.fake
cat > $D/chrome-ns.sh <<'EOF'
#!/bin/sh
exec unshare -rm sh -c 'mount --bind /tmp/chr/cpuinfo.fake /proc/cpuinfo && export LD_LIBRARY_PATH=/tmp/chr/root/usr/lib/aarch64-linux-gnu:/tmp/chr/root/usr/lib/chromium && exec /tmp/chr/root/usr/lib/chromium/chromium-headless-shell "$@"' sh "$@"
EOF
chmod +x $D/chrome-ns.sh
$D/chrome-ns.sh --version
