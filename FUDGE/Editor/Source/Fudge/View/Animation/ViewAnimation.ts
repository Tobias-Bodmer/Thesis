namespace Fudge {
  export interface ViewAnimationKey {
    key: FudgeCore.AnimationKey;
    path2D: Path2D;
    sequence: ViewAnimationSequence;
  }

  export interface ViewAnimationSequence {
    color: string;
    element: HTMLElement;
    sequence: FudgeCore.AnimationSequence;
  }

  export interface ViewAnimationEvent {
    event: string;
    path2D: Path2D;
  }
  export interface ViewAnimationLabel {
    label: string;
    path2D: Path2D;
  }


  export class ViewAnimation extends View {
    node: FudgeCore.Node;
    animation: FudgeCore.Animation;
    cmpAnimator: FudgeCore.ComponentAnimator;
    playbackTime: number;
    controller: AnimationList;
    private canvas: HTMLCanvasElement;
    private attributeList: HTMLDivElement;
    private crc: CanvasRenderingContext2D;
    private sheet: ViewAnimationSheet;
    private toolbar: HTMLDivElement;
    private hover: HTMLSpanElement;
    private time: FudgeCore.Time = new FudgeCore.Time();
    private playing: boolean = false;

    constructor(_container: ComponentContainer, _state: Object) {
      super(_container, _state);
      this.playbackTime = 500;

      this.openAnimation();
      this.fillContent();
      this.installListeners();
    }

    openAnimation(): void {
      //TODO replace with file opening dialoge

      let seq1: FudgeCore.AnimationSequence = new FudgeCore.AnimationSequence();
      seq1.addKey(new FudgeCore.AnimationKey(0, 0));
      seq1.addKey(new FudgeCore.AnimationKey(500, 45));
      seq1.addKey(new FudgeCore.AnimationKey(1500, -45));
      seq1.addKey(new FudgeCore.AnimationKey(2000, 0));
      let seq2: FudgeCore.AnimationSequence = new FudgeCore.AnimationSequence();
      // seq2.addKey(new FudgeCore.AnimationKey(0, 0));
      seq2.addKey(new FudgeCore.AnimationKey(500, 0, 0, 0.02));
      seq2.addKey(new FudgeCore.AnimationKey(1000, 5));
      seq2.addKey(new FudgeCore.AnimationKey(1500, 0, -0.02));
      this.animation = new FudgeCore.Animation("TestAnimation", {
        components: {
          ComponentTransform: [
            {
              "ƒ.ComponentTransform": {
                position: {
                  x: new FudgeCore.AnimationSequence(),
                  y: seq2,
                  z: new FudgeCore.AnimationSequence()
                },
                rotation: {
                  x: new FudgeCore.AnimationSequence(),
                  y: seq1,
                  z: new FudgeCore.AnimationSequence()
                }
              }
            }
          ]
        }
      },                                       60);
      this.animation.labels["One"] = 200;
      this.animation.labels["Two"] = 750;
      this.animation.setEvent("EventOne", 500);
      this.animation.setEvent("EventTwo", 1000);

      this.node = new FudgeCore.Node("Testnode");
      this.cmpAnimator = new FudgeCore.ComponentAnimator(this.animation);
    }

    fillContent(): void {
      // this.content = document.createElement("span");
      // this.content.id = "TESTID";
      this.toolbar = document.createElement("div");
      this.toolbar.id = "toolbar";
      this.toolbar.style.width = "300px";
      this.toolbar.style.height = "80px";
      this.toolbar.style.borderBottom = "1px solid black";
      this.fillToolbar(this.toolbar);


      this.attributeList = document.createElement("div");
      this.attributeList.id = "attributeList";
      this.attributeList.style.width = "300px";
      // this.attributeList.addEventListener(FudgeUserInterface.EVENT.UPDATE, this.changeAttribute.bind(this));
      this.attributeList.addEventListener(FudgeUserInterface.EVENT.CHANGE, this.changeAttribute.bind(this));
      //TODO: Add Moni's custom Element here
      this.controller = new AnimationList(this.animation.getMutated(this.playbackTime, 0, FudgeCore.ANIMATION_PLAYBACK.TIMEBASED_CONTINOUS), this.attributeList);


      this.canvas = document.createElement("canvas");
      this.canvas.width = 1500;
      this.canvas.height = 500;
      this.canvas.style.position = "absolute";
      this.canvas.style.left = "300px";
      this.canvas.style.top = "0px";
      this.canvas.style.borderLeft = "1px solid black";
      this.crc = this.canvas.getContext("2d");
      this.hover = document.createElement("span");
      this.hover.style.background = "black";
      this.hover.style.color = "white";
      this.hover.style.position = "absolute";
      this.hover.style.display = "none";

      this.dom.appendChild(this.toolbar);
      this.dom.appendChild(this.attributeList);
      // this.content.appendChild(this.canvasSheet);
      this.dom.appendChild(this.canvas);
      this.dom.appendChild(this.hover);

      // this.sheet = new ViewAnimationSheetDope(this, this.crc, null, new FudgeCore.Vector2(.5, 0.5), new FudgeCore.Vector2(0, 0));
      this.sheet = new ViewAnimationSheetCurve(this, this.crc, null, new FudgeCore.Vector2(0.5, 2), new FudgeCore.Vector2(0, 200));
      this.sheet.redraw(this.playbackTime);
      // sheet.translate();
    }

    installListeners(): void {
      this.canvas.addEventListener("click", this.mouseClick.bind(this));
      this.canvas.addEventListener("mousedown", this.mouseDown.bind(this));
      this.canvas.addEventListener("mousemove", this.mouseMove.bind(this));
      this.canvas.addEventListener("mouseup", this.mouseUp.bind(this));
      this.toolbar.addEventListener("click", this.toolbarClick.bind(this));
      this.toolbar.addEventListener("change", this.toolbarChange.bind(this));
      requestAnimationFrame(this.playAnimation.bind(this));
    }

    mouseClick(_e: MouseEvent): void {
      // console.log(_e);
    }
    mouseDown(_e: MouseEvent): void {
      if (_e.offsetY < 50) {
        this.setTime(_e.offsetX / this.sheet.scale.x);
        return;
      }
      let obj: ViewAnimationLabel | ViewAnimationKey | ViewAnimationEvent = this.sheet.getObjectAtPoint(_e.offsetX, _e.offsetY);
      if (!obj) return;

      // TODO: events should bubble to panel
      if (obj["label"]) {
        console.log(obj["label"]);
        this.dom.dispatchEvent(new CustomEvent(FudgeUserInterface.EVENT.SELECT, { detail: { name: obj["label"], time: this.animation.labels[obj["label"]] } }));
      }
      else if (obj["event"]) {
        console.log(obj["event"]);
        this.dom.dispatchEvent(new CustomEvent(FudgeUserInterface.EVENT.SELECT, { detail: { name: obj["event"], time: this.animation.events[obj["event"]] } }));
      }
      else if (obj["key"]) {
        console.log(obj["key"]);
        this.dom.dispatchEvent(new CustomEvent(FudgeUserInterface.EVENT.SELECT, { detail: obj["key"] }));
      }
      console.log(obj);
    }
    mouseMove(_e: MouseEvent): void {
      _e.preventDefault();
      if (_e.buttons != 1) return;
      if (_e.offsetY < 50) {
        this.setTime(_e.offsetX / this.sheet.scale.x);
        return;
      }
    }
    mouseUp(_e: MouseEvent): void {
      // console.log(_e);
      //
    }

    private fillToolbar(_tb: HTMLElement): void {

      let playmode: HTMLSelectElement = document.createElement("select");
      playmode.id = "playmode";
      for (let m in FudgeCore.ANIMATION_PLAYMODE) {
        if (isNaN(+m)) {
          let op: HTMLOptionElement = document.createElement("option");
          op.value = m;
          op.innerText = m;
          playmode.appendChild(op);
        }
      }
      _tb.appendChild(playmode);
      _tb.appendChild(document.createElement("br"));

      let fpsL: HTMLLabelElement = document.createElement("label");
      fpsL.setAttribute("for", "fps");
      fpsL.innerText = "FPS";
      let fpsI: HTMLInputElement = document.createElement("input");
      fpsI.type = "number";
      fpsI.min = "0";
      fpsI.max = "999";
      fpsI.step = "1";
      fpsI.id = "fps";
      fpsI.value = this.animation.fps.toString();
      fpsI.style.width = "40px";

      _tb.appendChild(fpsL);
      _tb.appendChild(fpsI);

      let spsL: HTMLLabelElement = document.createElement("label");
      spsL.setAttribute("for", "sps");
      spsL.innerText = "SPS";
      let spsI: HTMLInputElement = document.createElement("input");
      spsI.type = "number";
      spsI.min = "0";
      spsI.max = "999";
      spsI.step = "1";
      spsI.id = "sps";
      spsI.value = this.animation.fps.toString(); // stepsPerSecond.toString();
      spsI.style.width = "40px";

      _tb.appendChild(spsL);
      _tb.appendChild(spsI);
      _tb.appendChild(document.createElement("br"));


      let buttons: HTMLButtonElement[] = [];
      buttons.push(document.createElement("button"));
      buttons.push(document.createElement("button"));
      buttons.push(document.createElement("button"));
      buttons.push(document.createElement("button"));
      buttons.push(document.createElement("button"));
      buttons.push(document.createElement("button"));
      buttons.push(document.createElement("button"));
      buttons.push(document.createElement("button"));
      buttons.push(document.createElement("button"));
      buttons[0].classList.add("fa", "fa-fast-backward", "start");
      buttons[1].classList.add("fa", "fa-backward", "back");
      buttons[2].classList.add("fa", "fa-play", "play");
      buttons[3].classList.add("fa", "fa-pause", "pause");
      buttons[4].classList.add("fa", "fa-forward", "forward");
      buttons[5].classList.add("fa", "fa-fast-forward", "end");
      buttons[6].classList.add("fa", "fa-file", "add-label");
      buttons[7].classList.add("fa", "fa-bookmark", "add-event");
      buttons[8].classList.add("fa", "fa-plus-square", "add-key");
      buttons[0].id = "start";
      buttons[1].id = "back";
      buttons[2].id = "play";
      buttons[3].id = "pause";
      buttons[4].id = "forward";
      buttons[5].id = "end";
      buttons[6].id = "add-label";
      buttons[7].id = "add-event";
      buttons[8].id = "add-key";

      for (let b of buttons) {
        _tb.appendChild(b);
      }

    }

    private toolbarClick(_e: MouseEvent): void {
      // console.log("click", _e.target);
      let target: HTMLInputElement = <HTMLInputElement>_e.target;
      switch (target.id) {
        case "add-label":
          this.animation.labels[this.randomNameGenerator()] = this.playbackTime;
          this.sheet.redraw(this.playbackTime);
          break;
        case "add-event":
          this.animation.setEvent(this.randomNameGenerator(), this.playbackTime);
          this.sheet.redraw(this.playbackTime);
          break;
        case "add-key":

          break;
        case "start":
          this.playbackTime = 0;
          this.updateDisplay();
          break;
        case "back":
          this.playbackTime = this.playbackTime -= 1000 / this.animation.fps; // stepsPerSecond;
          this.playbackTime = Math.max(this.playbackTime, 0);
          this.updateDisplay();
          break;
        case "play":
          this.time.set(this.playbackTime);
          this.playing = true;
          break;
        case "pause":
          this.playing = false;
          break;
        case "forward":
          this.playbackTime = this.playbackTime += 1000 / this.animation.fps; // stepsPerSecond;
          this.playbackTime = Math.min(this.playbackTime, this.animation.totalTime);
          this.updateDisplay();
          break;
        case "end":
          this.playbackTime = this.animation.totalTime;
          this.sheet.redraw(this.playbackTime);
          this.updateDisplay();
          break;
        default:

          break;
      }
    }

    private toolbarChange(_e: MouseEvent): void {
      let target: HTMLInputElement = <HTMLInputElement>_e.target;

      switch (target.id) {
        case "playmode":
          this.cmpAnimator.playmode = FudgeCore.ANIMATION_PLAYMODE[target.value];
          // console.log(FudgeCore.ANIMATION_PLAYMODE[target.value]);
          break;
        case "fps":
          // console.log("fps changed to", target.value);
          if (!isNaN(+target.value))
            this.animation.fps = +target.value;
          break;
        case "sps":
          // console.log("sps changed to", target.value);
          if (!isNaN(+target.value)) {
            this.animation.fps /* stepsPerSecond */ = +target.value;
            this.sheet.redraw(this.playbackTime);
          }
          break;
        default:
          console.log("no clue what you changed...");
          break;
      }
    }

    private changeAttribute(_e: Event): void {
      console.log(_e);
      console.log(this.controller.getMutator());
      // console.log("1", this.controller.getMutator());
      // console.log("2", this.controller.collectMutator());
      // this.controller.BuildFromMutator(this.animation.getMutated(this.playbackTime, 1, FudgeCore.ANIMATION_PLAYBACK.TIMEBASED_CONTINOUS));
    }

    private updateDisplay(_m: FudgeCore.Mutator = null): void {
      this.sheet.redraw(this.playbackTime);
      if (!_m)
        _m = this.animation.getMutated(this.playbackTime, 0, this.cmpAnimator.playback);
      this.controller.updateMutator(_m);
    }

    private setTime(_time: number, updateDisplay: boolean = true): void {
      this.playbackTime = Math.min(this.animation.totalTime, Math.max(0, _time));
      if (updateDisplay) this.updateDisplay();
    }

    private playAnimation(): void {
      requestAnimationFrame(this.playAnimation.bind(this));
      if (!this.playing) return;
      let t: number = this.time.get();
      let m: FudgeCore.Mutator = {};
      [m, t] = this.cmpAnimator.updateAnimation(t);
      this.playbackTime = t;
      this.updateDisplay(m);
    }

    private randomNameGenerator(): string {
      let attr: string[] = ["red", "blue", "green", "pink", "yellow", "purple", "orange", "fast", "slow", "quick", "boring", "questionable", "king", "queen", "smart", "gold"];
      let anim: string[] = ["cow", "fish", "elephant", "cat", "dog", "bat", "chameleon", "caterpillar", "crocodile", "hamster", "horse", "panda", "giraffe", "lukas", "koala", "jellyfish", "lion", "lizard", "platypus", "scorpion", "penguin", "pterodactyl"];

      return attr[Math.floor(Math.random() * attr.length)] + "-" + anim[Math.floor(Math.random() * anim.length)];
    }
  }


}