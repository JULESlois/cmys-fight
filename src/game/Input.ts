export class Input {
  public keys: { [key: string]: boolean } = {};
  public justPressed: { [key: string]: boolean } = {};

  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;

  constructor() {
    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleKeyUp = this.onKeyUp.bind(this);
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
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
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  public isDown(key: string): boolean {
    return !!this.keys[key];
  }

  public wasPressed(key: string): boolean {
    return !!this.justPressed[key];
  }

  public getAxis(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    
    if (this.isDown("ArrowLeft") || this.isDown("a") || this.isDown("A")) x -= 1;
    if (this.isDown("ArrowRight") || this.isDown("d") || this.isDown("D")) x += 1;
    if (this.isDown("ArrowUp") || this.isDown("w") || this.isDown("W")) y -= 1;
    if (this.isDown("ArrowDown") || this.isDown("s") || this.isDown("S")) y += 1;
    
    // Normalize if moving diagonally
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }
    
    return { x, y };
  }
}
