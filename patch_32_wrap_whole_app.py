#!/usr/bin/env python3
# TEMPORARY debugging tool -- run from your project root:
#   python3 patch_32_wrap_whole_app.py
path = 'src/App.jsx'
with open(path) as f:
    content = f.read()

def do_replace(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}. Stopping without further changes -- paste this error back and we'll fix it.")
    return content.replace(old, new)

old_open = """  return (
    <div className="app">"""

new_open = """  return (
    <OnboardingErrorBoundary>
    <div className="app">"""

content = do_replace(content, old_open, new_open, "Edit 1 (wrap opening)")

old_close = """    </div>
  );
}"""

new_close = """    </div>
    </OnboardingErrorBoundary>
  );
}"""

content = do_replace(content, old_close, new_close, "Edit 2 (wrap closing)")

with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} -- the error boundary now wraps the entire app, so it'll catch a crash coming from anywhere, not just onboarding.")
