namespace AnimationGeneration {
    export let txtBatIdle: ƒ.TextureImage = new ƒ.TextureImage();
    export import ƒAid = FudgeAid;
    class MyAnimationClass {
        public id: Enemy.ENEMYNAME;
        public spriteSheetIdle: ƒ.CoatTextured;
        public spriteSheetWalk: ƒ.CoatTextured;
        idleNumberOfFrames: number;
        walkNumberOfFrames: number;
        idleFrameRate: number;
        walkFrameRate: number;

        clrWhite: ƒ.Color = ƒ.Color.CSS("white");
        animations: ƒAid.SpriteSheetAnimations = {};

        constructor(_id: Enemy.ENEMYNAME,
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

    let batAnimation: MyAnimationClass = new MyAnimationClass(Enemy.ENEMYNAME.BAT, txtBatIdle, 4, 12);
    //#endregion


    export function getAnimationById(_id: Enemy.ENEMYNAME): MyAnimationClass {
        switch (_id) {
            case Enemy.ENEMYNAME.BAT:
                return batAnimation;
            default:
                return null;
        }

    }

    export function createAllAnimations() {
        sheetArray.push(batAnimation);

        sheetArray.forEach(obj => {
            let idleWidth: number = obj.spriteSheetIdle.texture.texImageSource.width / obj.idleNumberOfFrames;
            let idleHeigth: number = obj.spriteSheetIdle.texture.texImageSource.height;
            let walkWidth: number = obj.spriteSheetWalk.texture.texImageSource.width / obj.idleNumberOfFrames;
            let walkHeigth: number = obj.spriteSheetWalk.texture.texImageSource.height;
            generateAnimationFromGrid(obj.spriteSheetIdle, obj.animations, "idle", idleWidth, idleHeigth, obj.idleNumberOfFrames, obj.idleFrameRate, 32);
            generateAnimationFromGrid(obj.spriteSheetWalk, obj.animations, "walk", walkWidth, walkHeigth, obj.walkNumberOfFrames, obj.walkFrameRate, 32);
        })
    }

    function generateAnimationFromGrid(_spritesheet: ƒ.CoatTextured, _animationsheet: ƒAid.SpriteSheetAnimations, _animationName: string, _width: number, _height: number, _numberOfFrames: number, _frameRate: number, _resolution: number) {
        let name = _animationName;
        let createdAnimation: ƒAid.SpriteSheetAnimation = new ƒAid.SpriteSheetAnimation(name, _spritesheet);
        createdAnimation.generateByGrid(ƒ.Rectangle.GET(0, 0, _width, _height), _numberOfFrames, 32, ƒ.ORIGIN2D.BOTTOMCENTER, ƒ.Vector2.X(_width));
        _animationsheet[name] = createdAnimation;
    }
}

