export class Input {
  public keys: { [key: string]: boolean } = {};
  public justPressed: { [key: string]: boolean } = {};

  constructor() {
    window.addEventListener("keydown", this.onKeyDown.bind(this));
    window.addEventListener("keyup", this.onKeyUp.bind(this));
  }

  private onKeyDown(e: KeyboardEvent) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
    if (!this.keys[e.key]) {
      this.justPressed[e.key] = true;
    }
    this.keys[e.key] = true;
  }

  private onKeyUp(e: KeyboardEvent) {
    this.keys[e.key] = false;
    this.justPressed[e.key] = false;
  }

  public update() {
    // Reset justPressed after the frame
    for (let key in this.justPressed) {
      this.justPressed[key] = false;
    }
  }

  public cleanup() {
    window.removeEventListener("keydown", this.onKeyDown.bind(this));
    window.removeEventListener("keyup", this.onKeyUp.bind(this));
  }
}
