/**
 * The kit's stylesheets, loaded once by the page frame (ModulePageFrame).
 *
 * Kit components deliberately do NOT import CSS themselves: Challenge and Play
 * tests are plain Node scripts, and Node cannot import a .css file. Keeping the
 * components CSS-free means a module's challenge/play definitions can import
 * kit components (e.g. ValueBars) and still run under test.
 */
import 'katex/dist/katex.min.css';
import './ui.css';
import './explore.css';
