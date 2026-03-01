// -- Infrastructure & Shared Setup ---
import './000-setup.suite';

// -- Mojo & Jojo (Baseline Profile) --
import './010-gen.suite';
import './011-preflight.suite';

import './020-sys.suite';

import './030-mem-remember.suite';
import './031-mem-recall.suite';

import './040-act.suite';

import './050-int-probe.suite';
import './051-int-generate.suite';
import './052-int-gemini.suite';
import './053-int-goose.sutie';
import './054-int-github-copilot.suite';
import './055-int-kilocode.suite';

// -- Kong & Zilla (Next Profile) --
import './120-sys.suite';
import './130-mem-remember.suite';
import './131-mem-recall.suite';
import './140-act.suite';
import './150-int.suite';

import './999-teardown.suite';