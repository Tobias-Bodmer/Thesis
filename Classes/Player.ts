namespace Player {

    export abstract class Player extends Entity.Entity {
        public client: Networking.ClientPrediction;
        readonly abilityCount: number = 1;
        currentabilityCount: number = this.abilityCount;

        constructor(_id: Entity.ID, _netId?: number) {
            super(_id, _netId);

            let ref = Game.avatarsJSON.find(avatar => avatar.name == Entity.ID[_id].toLowerCase())
            console.log(ref);
            this.attributes = new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, (<any>ref.attributes).scale, ref.attributes.knockbackForce, ref.attributes.armor, ref.attributes.coolDownReduction, ref.attributes.accuracy);

            this.tag = Tag.TAG.PLAYER;
            this.client = new Networking.ClientPrediction(this.netId);
            this.spriteScaleFactor = 2;
            this.updateScale(this.attributes.getScale, false);
            this.shadowOffsetX = 0.05;
            this.shadowOffsetY = -0.1;
        }

        public move(_direction: ƒ.Vector3) {

            if (_direction.magnitude > 0) {
                _direction.normalize();
                if (_direction.x >= 0) {
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                } else {
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALKLEFT);
                }
            } else if (_direction.magnitude <= 0) {
                if (this.currentAnimationState == Entity.ANIMATIONSTATES.WALKLEFT || this.currentAnimationState == Entity.ANIMATIONSTATES.IDLELEFT) {
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLELEFT);
                } else {
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                }
            }

            this.setCollider();

            this.scaleMoveVector(_direction);

            this.moveDirection.add(_direction);

            this.collide(this.moveDirection);

            this.moveDirection.subtract(_direction);
        }

        public openDoor(): void {
            let walls = Game.currentRoom.walls;
            walls.forEach((wall) => {
                if (wall.door != undefined && wall.door.isActive) {
                    if (wall.door.collider != undefined && this.collider.collidesRect(wall.door.collider)) {
                        (<Generation.Door>wall.door).changeRoom();
                    }
                }
            });
            if (Game.currentRoom.exitDoor != undefined) {
                if (Game.currentRoom.exitDoor.collider != undefined && this.collider.collidesRect(Game.currentRoom.exitDoor.collider)) {
                    (Game.currentRoom.exitDoor).changeRoom();
                }
            }
        }

        protected scaleMoveVector(_direction: Game.ƒ.Vector3) {
            if (Networking.client.id == Networking.client.idHost && this == Game.avatar1) {
                _direction.scale((Game.deltaTime * this.attributes.speed));
            } else {
                _direction.scale((this.client.minTimeBetweenTicks * this.attributes.speed));
            }
        }

        public predict() {
            if (Networking.client.idHost != Networking.client.id) {
                this.client.update();
            }
            else {
                this.move(InputSystem.move());
            }
        }

        public collide(_direction: Game.ƒ.Vector3): void {
            super.collide(_direction);

            if (Networking.client.id == Networking.client.idHost) {
                this.getItemCollision();
            }

            let enemies: Enemy.Enemy[] = Game.enemies;
            let enemiesCollider: Collider.Collider[] = [];
            enemies.forEach(element => {
                enemiesCollider.push(element.collider);
            })

            //Collision with Enemies
            // this.calculateCollider(enemiesCollider, _direction);

            if (this.canMoveX && this.canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction);
            } else if (this.canMoveX && !this.canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction);
            } else if (!this.canMoveX && this.canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction);
            }
        }

        getItemCollision() {
            let itemCollider: Items.Item[] = Game.items;
            itemCollider.forEach(item => {
                if (this.collider.collides(item.collider)) {

                    if (item instanceof Items.InternalItem && (<Items.InternalItem>item).choosenOneNetId != undefined) {
                        if ((<Items.InternalItem>item).choosenOneNetId != this.netId) {
                            return;
                        }
                    }

                    if (Game.currentRoom.roomType == Generation.ROOMTYPE.TREASURE) {
                        (<Generation.TreasureRoom>Game.currentRoom).onItemCollect(item);
                    }

                    if (Game.currentRoom.roomType == Generation.ROOMTYPE.MERCHANT) {
                        if (!(<Generation.MerchantRoom>Game.currentRoom).onItemCollect(item, this)) {
                            return;
                        }
                    }

                    item.addItemToEntity(this);
                    Networking.updateInventory(true, item.id, item.netId, this.netId);

                    if (item instanceof Items.InternalItem) {
                        console.log(item.name + ": " + item.description + " smth changed to: " + (<Items.InternalItem>item).value);
                    }
                    if (item instanceof Items.BuffItem) {
                        console.log(item.name + ": " + item.description + " smth changed to: " + Buff.BUFFID[(<Items.BuffItem>item).buff[0].id].toString());
                    }

                    if (Game.avatar1 == this) {
                        UI.itemPopUp(item);
                    }
                }
            })
        }

        public abstract attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean): void;



        public getKnockback(_knockbackForce: number, _position: ƒ.Vector3): void {
            super.getKnockback(_knockbackForce, _position);
        }

        public doAbility() {

        }
    }

    export class Melee extends Player {
        public block: Ability.Block = new Ability.Block(this.netId, 600, 1, 5 * 60);
        readonly abilityCooldownTime: number = 40;
        currentabilityCooldownTime: number = this.abilityCooldownTime;

        public weapon: Weapons.Weapon = new Weapons.MeleeWeapon(12, 1, Bullets.BULLETTYPE.MELEE, 1, this.netId, Weapons.AIM.NORMAL);
        public swordRadius: number = 0.75;


        public attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean) {
            this.weapon.shoot(_direction, _sync, _netId);
        }

        //Block
        public doAbility() {
            this.block.doAbility();
        }
    }

    export class Ranged extends Player {
        public weapon = new Weapons.RangedWeapon(35, 1, Bullets.BULLETTYPE.STANDARD, 1, this.netId, Weapons.AIM.NORMAL);
        public dash: Ability.Dash = new Ability.Dash(this.netId, 8, 1, 60, 5);
        performAbility: boolean = false;
        lastMoveDirection: Game.ƒ.Vector3;

        public attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean): void {
            this.weapon.shoot(_direction, _sync, _netId);
        }
        public move(_direction: ƒ.Vector3) {
            if (this.dash.doesAbility) {
                super.move(this.lastMoveDirection);
            } else {
                super.move(_direction);
                if (_direction.magnitude > 0) {
                    this.lastMoveDirection = _direction;
                }
            }
        }

        //Dash
        public doAbility() {
            this.dash.doAbility();
        }
    }
}