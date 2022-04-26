namespace Player {
    export enum PLAYERTYPE {
        RANGED,
        MELEE
    }

    export abstract class Player extends Entity.Entity implements Interfaces.IKnockbackable {
        public weapon: Weapons.Weapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.STANDARD, 1, this.netId, Weapons.AIM.NORMAL);

        public tick: number = 0;
        public positions: ƒ.Vector3[] = [];
        public hostPositions: ƒ.Vector3[] = [];
        time: number = 0;

        readonly abilityCount: number = 1;
        currentabilityCount: number = this.abilityCount;

        constructor(_id: Entity.ID, _attributes: Entity.Attributes, _netId?: number) {
            super(_id, _attributes, _netId);
            this.tag = Tag.TAG.PLAYER;
        }

        public move(_direction: ƒ.Vector3) {

            if (_direction.magnitude != 0) {
                _direction = Game.ƒ.Vector3.NORMALIZATION(_direction, 1)
                this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            }
            else if (_direction.magnitude == 0) {
                this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            }

            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();

            _direction.scale((1 / 60 * this.attributes.speed));

            this.moveDirection.add(_direction);

            this.collide(this.moveDirection);

            let doors: Generation.Door[] = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.TAG.ROOM)).doors;
            doors.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    (<Generation.Door>element).changeRoom();
                }
            });

            this.moveDirection.subtract(_direction);
        }

        collide(_direction: Game.ƒ.Vector3): void {
            super.collide(_direction);

            if (Networking.client.id == Networking.client.idHost) {
                this.getItemCollision();
            }

            let enemies: Enemy.Enemy[] = Game.enemies;
            let enemiesCollider: Collider.Collider[] = [];
            enemies.forEach(element => {
                enemiesCollider.push(element.collider);
            })
            this.calculateCollider(enemiesCollider, _direction);

            if (this.canMoveX && this.canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction, false);
            } else if (this.canMoveX && !this.canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction, false);
            } else if (!this.canMoveX && this.canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction, false);
            }
        }

        getItemCollision() {
            let itemCollider: Items.Item[] = Game.items;
            itemCollider.forEach(item => {
                if (this.collider.collides(item.collider)) {
                    Networking.updateInventory(item.id, item.netId, this.netId);
                    item.doYourThing(this);
                    this.items.push(item);
                    if (item instanceof Items.InternalItem) {
                        console.log(item.name + ": " + item.description + " smth changed to: " + (<Items.InternalItem>item).value);
                    }
                    if (item instanceof Items.BuffItem) {
                        console.log(item.name + ": " + item.description + " smth changed to: " + Buff.BUFFID[(<Items.BuffItem>item).buff[0].id].toString());

                    }
                }
            })
        }

        avatarPrediction() {
            this.time += Game.ƒ.Loop.timeFrameStartReal;

            while (this.time >= 1) {
                this.positions.push(new ƒ.Vector3(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.translation.z));
                if (Game.connected) {
                    Networking.avatarPrediction(this.cmpTransform.mtxLocal.translation, this.tick);
                }
                this.tick++;
                this.time -= 1;
            }

            if (Networking.client.id != Networking.client.idHost) {
                if (this.tick >= 1 && this.hostPositions[this.tick - 1] != undefined && this.positions[this.tick - 1] != undefined) {
                    if (!this.hostPositions[this.tick - 1].equals(this.positions[this.tick - 1], 0.1)) {
                        console.log("correct");
                        this.correctPosition();
                    }
                }
            }

            if (this.hostPositions.length >= 3) {
                this.hostPositions.slice(0, 1);
            }
            if (this.positions.length >= 3) {
                this.positions.slice(0, 1);
            }
        }

        async correctPosition() {
            if (this.hostPositions[this.tick] != undefined) {
                this.cmpTransform.mtxLocal.translation = this.hostPositions[this.tick];
            } else {
                setTimeout(() => { this.correctPosition }, 100);
            }
        }

        public attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean) {
            this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }

        public doKnockback(_body: Entity.Entity): void {
            // (<Enemy.Enemy>_body).getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }

        public getKnockback(_knockbackForce: number, _position: ƒ.Vector3): void {
            super.getKnockback(_knockbackForce, _position);
        }

        public doAbility() {

        }
    }

    export class Melee extends Player {
        protected block: Ability.Block = new Ability.Block(this.netId, 600, 1, 5 * Game.frameRate);
        readonly abilityCooldownTime: number = 40;
        currentabilityCooldownTime: number = this.abilityCooldownTime;

        public weapon: Weapons.Weapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.MELEE, 1, this.netId, Weapons.AIM.NORMAL);


        public attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean) {
            this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }

        //Block
        public doAbility() {

        }
    }
    export class Ranged extends Player {

        private dash: Ability.Dash = new Ability.Dash(this.netId, 150, 1, 5 * Game.frameRate, 2);
        performAbility: boolean = false;
        lastMoveDirection: Game.ƒ.Vector3;

        public move(_direction: ƒ.Vector3) {
            if (this.dash.doesAbility) {
                super.move(this.lastMoveDirection);
            } else {
                super.move(_direction);
                this.lastMoveDirection = _direction;
            }
        }

        //Dash
        public doAbility() {
            this.dash.doAbility();
        }
    }
}