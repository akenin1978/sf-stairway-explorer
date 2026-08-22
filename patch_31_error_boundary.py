#!/usr/bin/env python3
# TEMPORARY debugging tool -- run from your project root:
#   python3 patch_31_error_boundary.py
# This wraps OnboardingCarousel in an error boundary that shows the
# actual crash message directly on screen (no console/cable needed).
# We'll remove this once we've found and fixed the real bug.
path = 'src/App.jsx'
with open(path) as f:
    content = f.read()

def do_replace(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}. Stopping without further changes -- paste this error back and we'll fix it.")
    return content.replace(old, new)

old_import = "import OnboardingCarousel from './components/OnboardingCarousel';"
new_import = """import OnboardingCarousel from './components/OnboardingCarousel';
import { Component } from 'react';

// TEMPORARY debugging tool -- shows the actual crash message on screen
// instead of a silent blank page, so we can see mobile errors without
// needing a cable-connected remote debugger. Remove once the real bug
// is found and fixed.
class OnboardingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#fff',
            zIndex: 3000,
            padding: 24,
            fontFamily: 'monospace',
            fontSize: 13,
            overflow: 'auto',
          }}
        >
          <h2 style={{ color: '#c0392b' }}>Onboarding crashed:</h2>
          <p>{this.state.error.message}</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}"""

content = do_replace(content, old_import, new_import, "Edit 1 (add error boundary class)")

old_render = """      {showOnboarding && (
        <OnboardingCarousel
          totalStairways={totalStairways}
          onDismiss={dismissOnboarding}
        />
      )}"""

new_render = """      {showOnboarding && (
        <OnboardingErrorBoundary>
          <OnboardingCarousel
            totalStairways={totalStairways}
            onDismiss={dismissOnboarding}
          />
        </OnboardingErrorBoundary>
      )}"""

content = do_replace(content, old_render, new_render, "Edit 2 (wrap with boundary)")

with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} -- onboarding crashes will now show a visible error message on screen.")
