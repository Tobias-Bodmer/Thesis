namespace AnimationGeneration {
    export let txtRedTickIdle: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtRedTickWalk: ƒ.TextureImage = new ƒ.TextureImage();

    export let txtBatIdle: ƒ.TextureImage = new ƒ.TextureImage();

    export import ƒAid = FudgeAid;
    class MyAnimationClass {
        public id: Entity.ID;
        public spriteSheetIdle: ƒ.CoatTextured;
        public spriteSheetWalk: ƒ.CoatTextured;
        idleNumberOfFrames: number;
        walkNumberOfFrames: number;
        idleFrameRate: number;
        walkFrameRate: number;

        clrWhite: ƒ.Color = ƒ.Color.CSS("white");
        animations: ƒAid.SpriteSheetAnimations = {};
        idleScale: number;
        walkScale: number;

        constructor(_id: Entity.ID,
            _txtIdle: ƒ.TextureImage,
            _idleNumberOfFrames: number,
            _idleFrameRate: number,
            _txtWalk?: ƒ.TextureImage,
            _walkNumberOfFrames?: number,
            _walkFrameRate?: number) {
            this.id = _id;
            this.spriteSheetIdle = new ƒ.CoatTextured(this.clrWhite, _txtIdle);
            this.idleFrameRate = _idleFrameRate;
            this.idleNumberOfFrames = _idleNumberOfFrames;
            if (_txtWalk != undefined) {
                this.spriteSheetWalk = new ƒ.CoatTextured(this.clrWhite, _txtWalk);
                this.walkFrameRate = _walkFrameRate;
                this.walkNumberOfFrames = _walkNumberOfFrames;
            }
            else {
                this.spriteSheetWalk = new ƒ.CoatTextured(this.clrWhite, _txtIdle);
                this.walkFrameRate = _idleFrameRate;
                this.walkNumberOfFrames = _idleNumberOfFrames;
            }

        }
    }

    export let sheetArray: MyAnimationClass[] = [];
    //#region animation

    let batAnimation: MyAnimationClass = new MyAnimationClass(Entity.ID.BAT, txtBatIdle, 4, 12);
    let redTickAnimation: MyAnimationClass = new MyAnimationClass(Entity.ID.REDTICK, txtRedTickIdle, 6, 12, txtRedTickWalk, 4, 12);
    (<ƒAid.SpriteSheetAnimation>batAnimation.animations[""])
    //#endregion


    export function getAnimationById(_id: Entity.ID): MyAnimationClass {
        switch (_id) {
            case Entity.ID.BAT:
                return batAnimation;
            case Entity.ID.REDTICK:
                return redTickAnimation;
            default:
                return null;
        }

    }

    export function createAllAnimations() {
        sheetArray.push(batAnimation, redTickAnimation);

        sheetArray.forEach(obj => {
            let idleWidth: number = obj.spriteSheetIdle.texture.texImageSource.width / obj.idleNumberOfFrames;
            let idleHeigth: number = obj.spriteSheetIdle.texture.texImageSource.height;
            let walkWidth: number = obj.spriteSheetWalk.texture.texImageSource.width / obj.walkNumberOfFrames;
            let walkHeigth: number = obj.spriteSheetWalk.texture.texImageSource.height;
            generateAnimationFromGrid(obj.spriteSheetIdle, obj.animations, "idle", idleWidth, idleHeigth, obj.idleNumberOfFrames, obj.idleFrameRate, 22);
            generateAnimationFromGrid(obj.spriteSheetWalk, obj.animations, "walk", walkWidth, walkHeigth, obj.walkNumberOfFrames, obj.walkFrameRate, 22);
            obj.idleScale = getPixelRatio(idleHeigth, idleWidth);
            obj.walkScale = getPixelRatio(walkHeigth, walkWidth);
        })
    }

    function getPixelRatio(_width: number, _height: number): number {
        let max = Math.max(_width, _height);
        let min = Math.min(_width, _height);

        let scale = 1 / max * min;
        return scale;
    }

    function generateAnimationFromGrid(_spritesheet: ƒ.CoatTextured, _animationsheet: ƒAid.SpriteSheetAnimations, _animationName: string, _width: number, _height: number, _numberOfFrames: number, _frameRate: number, _resolution: number) {
        let name = _animationName;
        let createdAnimation: ƒAid.SpriteSheetAnimation = new ƒAid.SpriteSheetAnimation(name, _spritesheet);
        createdAnimation.generateByGrid(ƒ.Rectangle.GET(0, 0, _width, _height), _numberOfFrames, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(_width));
        _animationsheet[name] = createdAnimation;
        console.log(name + ": " + _animationsheet[name]);
    }
}

