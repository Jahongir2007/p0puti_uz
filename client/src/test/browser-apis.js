// Loaded before anything else in tests (see vite.config.js), so React sees these when it starts.
// jsdom has no AnimationEvent, so React would listen for the old "webkitAnimationEnd" event name
// and never see the animationend events tests send. Real browsers have it.
if (!("AnimationEvent" in window)) {
  window.AnimationEvent = class AnimationEvent extends Event {};
}
