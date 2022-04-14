namespace Entity {
    export class Entity extends Game.ƒAid.NodeSprite {
        currentState: BEHAVIOUR;
        currentAnimation: ANIMATIONSTATES;
        public tag: Tag.TAG;
        attributes: Attributes;
        collider: Collider.Collider;
        canMoveX: boolean = true;
        canMoveY: boolean = true;
        moveDirection: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();
        animations: ƒAid.SpriteSheetAnimations = {};

        constructor(_name: string, _attributes: Attributes) {
            super(_name);
            this.attributes = _attributes;
        }
    }
    export enum ANIMATIONSTATES {
        IDLE, WALK
    }
    export enum BEHAVIOUR {
        IDLE, FOLLOW, FLEE
    }
}