namespace Entity {

    export class Entity extends Game.ƒAid.NodeSprite implements Interfaces.INetworkable {
        protected currentAnimationState: ANIMATIONSTATES;
        private performKnockback: boolean = false;
        public tag: Tag.TAG;
        public netId: number;
        public netObjectNode: ƒ.Node = this;
        public id: Entity.ID;
        public attributes: Attributes;
        public collider: Collider.Collider;
        public items: Array<Items.Item> = [];
        public buffs: Buff.Buff[] = [];
        public offsetColliderX: number;
        public offsetColliderY: number;
        public colliderScaleFaktor: number;
        public weapon: Weapons.Weapon;
        protected canMoveX: boolean = true;
        protected canMoveY: boolean = true;
        protected moveDirection: Game.ƒ.Vector3 = Game.ƒ.Vector3.ZERO();
        protected animationContainer: AnimationGeneration.AnimationContainer;
        protected idleScale: number;
        protected currentKnockback: ƒ.Vector3 = ƒ.Vector3.ZERO();
        public shadow: Shadow;
        public spriteScaleFactor: number = 1;
        public shadowOffsetY: number = 0;
        public shadowOffsetX: number = 0;


        constructor(_id: Entity.ID, _netId: number) {
            super(getNameById(_id));
            this.netId = Networking.IdManager(_netId);
            this.id = _id;
            this.attributes = new Attributes(1, 1, 1, 1, 1, 1, 1, 1);
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.offsetColliderX = 0;
            this.offsetColliderY = 0;
            this.colliderScaleFaktor = 1;
            this.collider = new Collider.Collider(new ƒ.Vector2(this.mtxLocal.translation.x + (this.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (this.offsetColliderY * this.mtxLocal.scaling.y)), (this.cmpTransform.mtxLocal.scaling.x / 2) * this.colliderScaleFaktor, this.netId);

            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.shadow = new Shadow(this);

            this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.eventUpdate);
        }



        public eventUpdate = (_event: Event): void => {
            this.update();
        };

        public update(): void {
            this.updateBuffs();
            this.shadow.updateShadowPos();
            if (Networking.client.idHost == Networking.client.id) {
                this.setCollider();
            }
        }

        public updateScale(_newScale: number, _updateScaleDependencies: boolean) {
            if (_updateScaleDependencies) {
                this.attributes.updateScaleDependencies(_newScale);
            }

            this.mtxLocal.scaling = new ƒ.Vector3(_newScale * this.spriteScaleFactor, _newScale * this.spriteScaleFactor, 1);
            this.collider.setRadius((this.cmpTransform.mtxLocal.scaling.x / 2) * this.colliderScaleFaktor);
            this.attributes.scale = _newScale;
        }

        public setCollider() {
            this.collider.setPosition(new ƒ.Vector2(this.mtxLocal.translation.x + (this.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (this.offsetColliderY * this.mtxLocal.scaling.y)));
        }

        protected updateBuffs() {
            if (this.buffs.length == 0) {
                return;
            }
            for (let i = 0; i < this.buffs.length; i++) {
                this.buffs[i].doBuffStuff(this);
            }
        }

        protected collide(_direction: ƒ.Vector3) {
            this.canMoveX = true;
            this.canMoveY = true;
            let walls: Generation.Wall[] = Game.currentRoom.walls;
            let wallColliders: Game.ƒ.Rectangle[] = [];
            walls.forEach(elem => {
                wallColliders.push(elem.collider);
            })
            let mewDirection = _direction.clone;
            if (!mewDirection.equals(Game.ƒ.Vector3.ZERO())) {
                mewDirection.normalize();
                mewDirection.scale((Game.deltaTime * this.attributes.speed));
            }
            this.calculateCollision(wallColliders, mewDirection);
        }

        protected calculateCollision(_collider: Collider.Collider[] | Game.ƒ.Rectangle[], _direction: ƒ.Vector3) {
            _collider.forEach((element) => {
                if (element instanceof Collider.Collider) {
                    if (this.collider.collides(element)) {
                        let intersection = this.collider.getIntersection(element);
                        let areaBeforeMove = intersection;

                        if (areaBeforeMove < this.collider.getRadius + element.getRadius) {
                            let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                            let newDirection = new Game.ƒ.Vector2(_direction.x, 0)
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                            if (this.collider.getIntersection(element) != null) {
                                let newIntersection = this.collider.getIntersection(element);
                                let areaAfterMove = newIntersection;

                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveX = false;
                                }
                            }

                            this.collider.position = oldPosition;
                            newDirection = new Game.ƒ.Vector2(0, _direction.y);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                            if (this.collider.getIntersection(element) != null) {
                                let newIntersection = this.collider.getIntersection(element);
                                let areaAfterMove = newIntersection;

                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveY = false;
                                }
                            }
                            this.collider.position = oldPosition;
                        }


                        if (Networking.client.id == Networking.client.idHost) {
                            if (element.ownerNetId == Game.avatar1.netId) {
                                Game.avatar1.getKnockback(this.attributes.knockbackForce, this.mtxLocal.translation);
                            }
                            if (element.ownerNetId == Game.avatar2.netId) {
                                Networking.knockbackPush(this.attributes.knockbackForce, this.mtxLocal.translation);
                            }
                        }
                    }
                }
                else if (element instanceof Game.ƒ.Rectangle) {
                    if (this.collider.collidesRect(element)) {
                        let intersection = this.collider.getIntersectionRect(element);
                        let areaBeforeMove = intersection.height * intersection.width;

                        if (areaBeforeMove < this.mtxLocal.scaling.x * this.mtxLocal.scaling.y) {
                            let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                            let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                            if (this.collider.getIntersectionRect(element) != null) {
                                let newIntersection = this.collider.getIntersectionRect(element);
                                let areaAfterMove = newIntersection.height * newIntersection.width;

                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveX = false;
                                }
                            }

                            this.collider.position = oldPosition;
                            newDirection = new Game.ƒ.Vector2(0, _direction.y);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                            if (this.collider.getIntersectionRect(element) != null) {
                                let newIntersection = this.collider.getIntersectionRect(element);
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
                }
            })
        }
        /**
         * does Damage to the Entity
         * @param _value value how much damage is applied
         */
        public getDamage(_value: number) {
            console.log("get hit");
            if (Networking.client.idHost == Networking.client.id) {
                if (_value != null && this.attributes.hitable) {
                    let hitValue = this.getDamageReduction(_value);
                    this.attributes.healthPoints -= hitValue;
                    Game.graph.addChild(new UI.DamageUI(this.mtxLocal.translation, Math.round(hitValue)));
                    Networking.updateUI(this.mtxLocal.translation.toVector2(), Math.round(hitValue));
                    Networking.updateEntityAttributes(<Interfaces.IAttributeValuePayload>{ value: this.attributes }, this.netId);
                }
                if (this.attributes.healthPoints <= 0) {
                    Networking.removeEntity(this.netId);
                    this.die();
                }
            }
        }

        public die() {
            Networking.popID(this.netId);
            Game.graph.removeChild(this);
        }

        private getDamageReduction(_value: number): number {
            return _value * (1 - Calculation.clampNumber((this.attributes.armor / 100), 0, 1));
        }
        //#region knockback

        public getKnockback(_knockbackForce: number, _position: Game.ƒ.Vector3) {
            if (!this.performKnockback) {
                this.performKnockback = true;
                let direction: Game.ƒ.Vector3 = Game.ƒ.Vector2.DIFFERENCE(this.cmpTransform.mtxLocal.translation.toVector2(), _position.toVector2()).toVector3(0);
                let knockBackScaling: number = Game.deltaTime * this.attributes.getScale;

                direction.normalize();

                direction.scale(_knockbackForce * knockBackScaling);

                this.currentKnockback.add(direction);
            }
        }

        protected reduceKnockback() {
            this.currentKnockback.scale(0.5);
            if (this.currentKnockback.magnitude < 0.0001) {
                this.currentKnockback = Game.ƒ.Vector3.ZERO();
                this.performKnockback = false;
            }
        }
        //#endregion

        public switchAnimation(_name: ANIMATIONSTATES) {
            let name: string = ANIMATIONSTATES[_name].toLowerCase();
            if (this.animationContainer != null && <ƒAid.SpriteSheetAnimation>this.animationContainer.animations[name] != null) {
                if (this.currentAnimationState != _name) {
                    switch (_name) {
                        case ANIMATIONSTATES.IDLE:
                            this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.IDLE;
                            break;
                        case ANIMATIONSTATES.WALK:
                            this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.WALK;
                            break;
                        case ANIMATIONSTATES.IDLELEFT:
                            this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.IDLELEFT;
                            break;
                        case ANIMATIONSTATES.WALKLEFT:
                            this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.WALKLEFT;
                            break;
                        case ANIMATIONSTATES.SUMMON:
                            this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.SUMMON;
                            break;
                        case ANIMATIONSTATES.ATTACK:
                            this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.ATTACK;

                            break;
                        case ANIMATIONSTATES.TELEPORT:
                            this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.TELEPORT;
                            break;
                    }
                    this.framerate = this.animationContainer.frameRate.find(obj => obj[0] == name)[1];
                    this.setFrameDirection(1);
                    Networking.updateEntityAnimationState(this.currentAnimationState, this.netId);
                }
            }
            else {
                console.warn("no animationContainer or animation with name: " + name + " at Entity: " + this.name);
            }
        }


    }
    export enum ANIMATIONSTATES {
        IDLE, IDLELEFT, WALK, WALKLEFT, SUMMON, ATTACK, TELEPORT
    }

    export enum BEHAVIOUR {
        IDLE, FOLLOW, FLEE, SUMMON, ATTACK, TELEPORT
    }

    export enum ID {
        RANGED,
        MELEE,
        MERCHANT,
        BAT,
        REDTICK,
        SMALLTICK,
        SKELETON,
        OGER,
        SUMMONER,
        BIGBOOM
    }

    export function getNameById(_id: Entity.ID): string {
        switch (_id) {
            case ID.RANGED:
                return "Ranged";
            case ID.MELEE:
                return "Tank";
            case ID.BAT:
                return "Bat";
            case ID.REDTICK:
                return "RedTick";
            case ID.SMALLTICK:
                return "SmallTick";
            case ID.SKELETON:
                return "Skeleton";
            case ID.OGER:
                return "Oger";
            case ID.SUMMONER:
                return "Summoner";
            case ID.BIGBOOM:
                return "Big Boom";
        }
        return null;
    }
}