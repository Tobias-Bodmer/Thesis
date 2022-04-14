namespace Entity {
    export class Entity extends Game.ƒAid.NodeSprite {
        currentAnimation: ANIMATIONSTATES;
        public tag: Tag.TAG;
        id: Entity.ID;
        attributes: Attributes;
        collider: Collider.Collider;
        canMoveX: boolean = true;
        canMoveY: boolean = true;
        moveDirection: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();
        animations: ƒAid.SpriteSheetAnimations = {};
        performKnockback: boolean = false;

        constructor(_id: Entity.ID, _attributes: Attributes) {
            super(getNameById(_id));
            this.id = _id;
            this.attributes = _attributes;
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                this.animations = AnimationGeneration.getAnimationById(this.id).animations;
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
        }

        public update() {
            this.updateCollider();
        }

        updateCollider() {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
        }

        collide(_direction: ƒ.Vector3) {
            this.canMoveX = true;
            this.canMoveY = true;
            let colliders: Generation.Wall[] = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.TAG.ROOM)).walls;
            colliders.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    let intersection = this.collider.getIntersectionRect(element.collider);
                    let areaBeforeMove = Math.round((intersection.height * intersection.width) * 1000) / 1000;

                    if (areaBeforeMove < this.mtxLocal.scaling.x * this.mtxLocal.scaling.y) {
                        let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                        let newDirection = new Game.ƒ.Vector2(_direction.x, 0)
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersectionRect(element.collider) != null) {
                            let newIntersection = this.collider.getIntersectionRect(element.collider);
                            let areaAfterMove = Math.round((newIntersection.height * newIntersection.width) * 1000) / 1000;

                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveX = false;
                            }
                        }



                        this.collider.position = oldPosition;
                        newDirection = new Game.ƒ.Vector2(0, _direction.y);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersectionRect(element.collider) != null) {
                            let newIntersection = this.collider.getIntersectionRect(element.collider);
                            let areaAfterMove = Math.round((newIntersection.height * newIntersection.width) * 1000) / 1000;

                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveY = false;
                            }
                        }
                        this.collider.position = oldPosition;
                    } else {
                        this.canMoveX = false;
                        this.canMoveY = false;
                    }

                }
            })
        }

        public getDamage(_value: number) {
            if (_value != null && this.attributes.hitable) {
                this.attributes.healthPoints -= _value;
            }
        }
        //#region knockback
        public doKnockback(_body: Entity.Entity) {

        }

        public getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3) {
            if (!this.performKnockback) {
                this.performKnockback = true;
                let direction: Game.ƒ.Vector3 = Game.ƒ.Vector2.DIFFERENCE(this.cmpTransform.mtxLocal.translation.toVector2(), _position.toVector2()).toVector3(0);
                let knockBackScaling: number = Game.frameRate * this.attributes.scale;

                direction.normalize();

                direction.scale(_knockbackForce * 1 / knockBackScaling);

                this.moveDirection.add(direction);

                console.log(this.moveDirection.magnitude);

                reduceKnockback(this, direction, this.moveDirection);

                function reduceKnockback(_elem: Entity, _direction: Game.ƒ.Vector3, _moveDirection: Game.ƒ.Vector3) {
                    // _knockbackForce = _knockbackForce / knockBackScaling;
                    if (_knockbackForce > 0.1) {
                        setTimeout(() => {
                            _moveDirection.subtract(direction);

                            _knockbackForce /= 3;

                            direction.scale(_knockbackForce * (1 / knockBackScaling));

                            _moveDirection.add(direction);

                            reduceKnockback(_elem, _direction, _moveDirection);
                        }, 200);
                    } else {
                        _moveDirection.subtract(direction);
                        _elem.performKnockback = false;
                    }
                }
            }
        }
        //#endregion



    }
    export enum ANIMATIONSTATES {
        IDLE, WALK
    }

    export enum ID {
        PLAYER1,
        PLAYER2,
        BAT,
        REDTICK,
        SMALLTICK,
        SKELETON
    }

    export function getNameById(_id: Entity.ID): string {
        switch (_id) {
            case ID.PLAYER1:
                return "player1";
            case ID.PLAYER2:
                return "player2";
            case ID.BAT:
                return "bat";
            case ID.REDTICK:
                return "redTick";
            case ID.SMALLTICK:
                return "smallTick";
            case ID.SKELETON:
                return "skeleton";
        }
    }
}