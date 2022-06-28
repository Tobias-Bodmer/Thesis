namespace AnimationGeneration {
    export let txtRedTickIdle: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtRedTickWalk: ƒ.TextureImage = new ƒ.TextureImage();

    export let txtSmallTickIdle: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtSmallTickWalk: ƒ.TextureImage = new ƒ.TextureImage();

    export let txtBatIdle: ƒ.TextureImage = new ƒ.TextureImage();

    export let txtSkeletonIdle: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtSkeletonWalk: ƒ.TextureImage = new ƒ.TextureImage();

    export let txtOgerIdle: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtOgerWalk: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtOgerAttack: ƒ.TextureImage = new ƒ.TextureImage();


    export let txtSummonerIdle: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtSummonerSummon: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtSummonerTeleport: ƒ.TextureImage = new ƒ.TextureImage();

    export let txtRangedIdle: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtRangedWalk: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtRangedIdleLeft: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtRangedWalkLeft: ƒ.TextureImage = new ƒ.TextureImage();


    export import ƒAid = FudgeAid;

    export class AnimationContainer {
        id: Entity.ID;
        animations: ƒAid.SpriteSheetAnimations = {};
        scale: [string, number][] = [];
        frameRate: [string, number][] = [];
        constructor(_id: Entity.ID) {
            this.id = _id;
            this.getAnimationById();
        }
        addAnimation(_ani: ƒAid.SpriteSheetAnimation, _scale: number, _frameRate: number) {
            this.animations[_ani.name] = _ani;
            this.scale.push([_ani.name, _scale]);
            this.frameRate.push([_ani.name, _frameRate]);
        }

        getAnimationById() {
            switch (this.id) {
                case Entity.ID.BAT:
                    this.addAnimation(batIdle.generatedSpriteAnimation, batIdle.animationScale, batIdle.frameRate);
                    break;
                case Entity.ID.REDTICK:
                    this.addAnimation(redTickIdle.generatedSpriteAnimation, redTickIdle.animationScale, redTickIdle.frameRate);
                    this.addAnimation(redTickWalk.generatedSpriteAnimation, redTickWalk.animationScale, redTickWalk.frameRate);
                    break;
                case Entity.ID.SMALLTICK:
                    this.addAnimation(smallTickIdle.generatedSpriteAnimation, smallTickIdle.animationScale, smallTickIdle.frameRate);
                    this.addAnimation(smallTickWalk.generatedSpriteAnimation, smallTickWalk.animationScale, smallTickWalk.frameRate);
                    break;
                case Entity.ID.SKELETON:
                    this.addAnimation(skeletonIdle.generatedSpriteAnimation, skeletonIdle.animationScale, skeletonIdle.frameRate);
                    this.addAnimation(skeletonWalk.generatedSpriteAnimation, skeletonWalk.animationScale, skeletonWalk.frameRate);
                    break;
                case Entity.ID.OGER:
                    this.addAnimation(ogerIdle.generatedSpriteAnimation, ogerIdle.animationScale, ogerIdle.frameRate);
                    this.addAnimation(ogerWalk.generatedSpriteAnimation, ogerWalk.animationScale, ogerWalk.frameRate);
                    this.addAnimation(ogerAttack.generatedSpriteAnimation, ogerAttack.animationScale, ogerAttack.frameRate);
                    break;
                case Entity.ID.SUMMONER:
                    this.addAnimation(summonerIdle.generatedSpriteAnimation, summonerIdle.animationScale, summonerIdle.frameRate);
                    this.addAnimation(summonerWalk.generatedSpriteAnimation, summonerWalk.animationScale, summonerWalk.frameRate);
                    this.addAnimation(summonerSummon.generatedSpriteAnimation, summonerSummon.animationScale, summonerSummon.frameRate);
                    this.addAnimation(summonerTeleport.generatedSpriteAnimation, summonerTeleport.animationScale, summonerTeleport.frameRate);
                    break;
                case Entity.ID.RANGED:
                    this.addAnimation(rangedIdle.generatedSpriteAnimation, rangedIdle.animationScale, rangedIdle.frameRate);
                    this.addAnimation(rangedWalk.generatedSpriteAnimation, rangedWalk.animationScale, rangedWalk.frameRate);
                    this.addAnimation(rangedIdleLeft.generatedSpriteAnimation, rangedIdleLeft.animationScale, rangedIdleLeft.frameRate);
                    this.addAnimation(rangedWalkLeft.generatedSpriteAnimation, rangedWalkLeft.animationScale, rangedWalkLeft.frameRate);
                    break;

            }
        }
    }

    class MyAnimationClass {
        public id: Entity.ID;
        animationName: string;
        public spriteSheet: ƒ.TextureImage;
        amountOfFrames: number;
        frameRate: number;
        generatedSpriteAnimation: ƒAid.SpriteSheetAnimation;
        animationScale: number;

        constructor(_id: Entity.ID, _animationName: string, _texture: ƒ.TextureImage, _amountOfFrames: number, _frameRate: number,) {
            this.id = _id;
            this.animationName = _animationName;
            this.spriteSheet = _texture;
            this.frameRate = _frameRate;
            this.amountOfFrames = _amountOfFrames;
            generateAnimationFromGrid(this);
        }

        //TODO: get animation scale
    }

    //#region spriteSheet
    let rangedIdle: MyAnimationClass;
    let rangedWalk: MyAnimationClass;
    let rangedIdleLeft: MyAnimationClass;
    let rangedWalkLeft: MyAnimationClass;

    let batIdle: MyAnimationClass;

    let redTickIdle: MyAnimationClass;
    let redTickWalk: MyAnimationClass;

    let smallTickIdle: MyAnimationClass;
    let smallTickWalk: MyAnimationClass;

    let skeletonIdle: MyAnimationClass;
    let skeletonWalk: MyAnimationClass;

    let ogerIdle: MyAnimationClass;
    let ogerWalk: MyAnimationClass;
    let ogerAttack: MyAnimationClass;

    let summonerIdle: MyAnimationClass;
    let summonerWalk: MyAnimationClass;
    let summonerSummon: MyAnimationClass;
    let summonerTeleport: MyAnimationClass;
    //#endregion


    //#region AnimationContainer
    let rangedAnimation: AnimationContainer;
    let batAnimation: AnimationContainer;
    let redTickAnimation: AnimationContainer;
    let smallTickAnimation: AnimationContainer;
    let skeletonAnimation: AnimationContainer;
    let ogerAnimation: AnimationContainer;
    let summonerAnimation: AnimationContainer;
    //#endregion

    export function generateAnimationObjects() {

        rangedIdle = new MyAnimationClass(Entity.ID.RANGED, "idle", txtRangedIdle, 5, 12);
        rangedWalk = new MyAnimationClass(Entity.ID.RANGED, "walk", txtRangedWalk, 8, 12);
        rangedIdleLeft = new MyAnimationClass(Entity.ID.RANGED, "idleleft", txtRangedIdleLeft, 5, 12);
        rangedWalkLeft = new MyAnimationClass(Entity.ID.RANGED, "walkleft", txtRangedWalkLeft, 8, 12);

        batIdle = new MyAnimationClass(Entity.ID.BAT, "idle", txtBatIdle, 4, 12);

        redTickIdle = new MyAnimationClass(Entity.ID.REDTICK, "idle", txtRedTickIdle, 6, 12);
        redTickWalk = new MyAnimationClass(Entity.ID.REDTICK, "walk", txtRedTickWalk, 4, 16);

        smallTickIdle = new MyAnimationClass(Entity.ID.SMALLTICK, "idle", txtSmallTickIdle, 6, 12);
        smallTickWalk = new MyAnimationClass(Entity.ID.SMALLTICK, "walk", txtSmallTickWalk, 4, 12);

        skeletonIdle = new MyAnimationClass(Entity.ID.SKELETON, "idle", txtSkeletonIdle, 5, 12);
        skeletonWalk = new MyAnimationClass(Entity.ID.SKELETON, "walk", txtSkeletonWalk, 7, 12);

        ogerIdle = new MyAnimationClass(Entity.ID.OGER, "idle", txtOgerIdle, 5, 6);
        ogerWalk = new MyAnimationClass(Entity.ID.OGER, "walk", txtOgerWalk, 6, 6);
        ogerAttack = new MyAnimationClass(Entity.ID.OGER, "attack", txtOgerAttack, 10, 12);

        summonerIdle = new MyAnimationClass(Entity.ID.SUMMONER, "idle", txtSummonerIdle, 6, 12);
        summonerWalk = new MyAnimationClass(Entity.ID.SUMMONER, "walk", txtSummonerIdle, 6, 12);
        summonerSummon = new MyAnimationClass(Entity.ID.SUMMONER, "summon", txtSummonerSummon, 13, 12);
        summonerTeleport = new MyAnimationClass(Entity.ID.SUMMONER, "teleport", txtSummonerTeleport, 6, 12);


        rangedAnimation = new AnimationContainer(Entity.ID.RANGED);
        batAnimation = new AnimationContainer(Entity.ID.BAT);
        redTickAnimation = new AnimationContainer(Entity.ID.REDTICK);
        smallTickAnimation = new AnimationContainer(Entity.ID.SMALLTICK);
        skeletonAnimation = new AnimationContainer(Entity.ID.SKELETON);
        ogerAnimation = new AnimationContainer(Entity.ID.OGER);
        summonerAnimation = new AnimationContainer(Entity.ID.SUMMONER);

    }

    export function getAnimationById(_id: Entity.ID): AnimationContainer {
        switch (_id) {
            case Entity.ID.BAT:
                return batAnimation;
            case Entity.ID.REDTICK:
                return redTickAnimation;
            case Entity.ID.SMALLTICK:
                return smallTickAnimation;
            case Entity.ID.SKELETON:
                return skeletonAnimation;
            case Entity.ID.OGER:
                return ogerAnimation;
            case Entity.ID.SUMMONER:
                return summonerAnimation;
            case Entity.ID.RANGED:
                return rangedAnimation;
            default:
                return null;
        }

    }


    function getPixelRatio(_width: number, _height: number): number {
        let max = Math.max(_width, _height);
        let min = Math.min(_width, _height);

        let scale = 1 / max * min;
        return scale;
    }

    export function generateAnimationFromGrid(_class: MyAnimationClass) {
        let clrWhite: ƒ.Color = ƒ.Color.CSS("white");
        let coatedSpriteSheet: ƒ.CoatTextured = new ƒ.CoatTextured(clrWhite, _class.spriteSheet);
        let width: number = _class.spriteSheet.texImageSource.width / _class.amountOfFrames;
        let height: number = _class.spriteSheet.texImageSource.height;
        let createdAnimation: ƒAid.SpriteSheetAnimation = new ƒAid.SpriteSheetAnimation(_class.animationName, coatedSpriteSheet);
        createdAnimation.generateByGrid(ƒ.Rectangle.GET(0, 0, width, height), _class.amountOfFrames, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(width));
        _class.animationScale = getPixelRatio(width, height);
        _class.generatedSpriteAnimation = createdAnimation;
    }


}

