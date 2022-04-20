namespace Entity {
    export class Entity extends Game.ƒAid.NodeSprite {
        currentAnimation: ANIMATIONSTATES;
        public tag: Tag.TAG;
        public netId: number;
        id: Entity.ID;
        attributes: Attributes;
        collider: Collider.Collider;
        canMoveX: boolean = true;
        canMoveY: boolean = true;
        moveDirection: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();
        animations: ƒAid.SpriteSheetAnimations = {};
        performKnockback: boolean = false;
        idleScale: number;
        buffs: Buff.Buff[] = [];

        constructor(_id: Entity.ID, _attributes: Attributes, _netId: number) {
            super(getNameById(_id));
            this.id = _id;
            this.attributes = _attributes;
            if (_netId != undefined) {
                if (this.netId != undefined) {
                    Networking.popID(this.netId);
                }
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            else {
                this.netId = Networking.idGenerator()
            }
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animations = ani.animations;
                this.idleScale = ani.idleScale;
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.scale(new ƒ.Vector3(this.attributes.scale, this.attributes.scale, this.attributes.scale));
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2);
        }

        public update() {
            this.updateCollider();
            this.updateBuffs();
        }

        updateCollider() {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
        }

        updateBuffs() {
            if (this.buffs.length == 0) {
                return;
            }
            for (let i = 0; i < this.buffs.length; i++) {
                if (this.buffs[i] instanceof Buff.DamageBuff) {
                    if (!this.buffs[i].doBuffStuff(this)) {
                        this.buffs.splice(i);
                        Networking.updateBuffList(this.buffs, this.netId);
                    }
                }
            }
        }

        collide(_direction: ƒ.Vector3) {
            this.canMoveX = true;
            this.canMoveY = true;
            let colliders: Generation.Wall[] = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.TAG.ROOM)).walls;
            colliders.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    let intersection = this.collider.getIntersectionRect(element.collider);
                    let areaBeforeMove = intersection.height * intersection.width;

                    if (areaBeforeMove < this.mtxLocal.scaling.x * this.mtxLocal.scaling.y) {
                        let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                        let newDirection = new Game.ƒ.Vector2(_direction.x, 0)
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersectionRect(element.collider) != null) {
                            let newIntersection = this.collider.getIntersectionRect(element.collider);
                            let areaAfterMove = newIntersection.height * newIntersection.width;

                            if (areaBeforeMove < areaAfterMove) {
                                this.canMoveX = false;
                            }
                        }



                        this.collider.position = oldPosition;
                        newDirection = new Game.ƒ.Vector2(0, _direction.y);
                        this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                        if (this.collider.getIntersectionRect(element.collider) != null) {
                            let newIntersection = this.collider.getIntersectionRect(element.collider);
                            let areaAfterMove = newIntersection.height * newIntersection.width;

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
            if (Networking.client.idHost == Networking.client.id) {
                if (_value != null && this.attributes.hitable) {
                    let hitValue = this.getDamageReduction(_value);
                    this.attributes.healthPoints -= hitValue;
                    Game.graph.addChild(new UI.DamageUI(this.mtxLocal.translation, Math.round(hitValue)));
                    Networking.updateUI(this.mtxLocal.translation.toVector2(), Math.round(hitValue));
                }
                if (this.attributes.healthPoints <= 0) {

                    Networking.removeEnemy(this.netId);
                    Networking.popID(this.netId);
                    this.die();
                }
            }
        }

        die() {
            Game.graph.removeChild(this);
        }

        private getDamageReduction(_value: number): number {
            return _value * (1 - (this.attributes.armor / 100));
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

                reduceKnockback(this, direction, this.moveDirection);

                function reduceKnockback(_elem: Entity, _direction: Game.ƒ.Vector3, _moveDirection: Game.ƒ.Vector3) {
                    // _knockbackForce = _knockbackForce / knockBackScaling;
                    if (_knockbackForce > 0.01) {
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
        IDLE, WALK, SUMMON
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