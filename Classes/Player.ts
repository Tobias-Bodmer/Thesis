namespace Player {

    export abstract class Player extends Game.ƒAid.NodeSprite {
        public tag: Tag.Tag = Tag.Tag.PLAYER;
        public items: Array<Items.Item> = [];
        public properties: Character;
        public weapon: Weapons.Weapon = new Weapons.Weapon(5,1);

        collider: ƒ.Rectangle;

        constructor(_name: string, _properties: Character) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.properties = _properties;
            this.collider = new ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, ƒ.ORIGIN2D.CENTER);
        }

        public move(_direction: ƒ.Vector3) {
            let canMoveX: boolean = true;
            let canMoveY: boolean = true;
            //TODO: collider position transform by Center 
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
            this.collider.position.subtract(ƒ.Vector2.SCALE(this.collider.size, 0.5));

            _direction.scale((1 / 60 * this.properties.attributes.speed));

            let colliders: Generation.Wall[] = (<Generation.Room>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.Tag.ROOM)).walls;
            colliders.forEach((element) => {
                if (this.collider.collides(element.collider)) {

                    let intersection = this.collider.getIntersection(element.collider);
                    let areaBeforeMove = intersection.height * intersection.width;

                    let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                    let newDirection = new Game.ƒ.Vector2(_direction.x, 0)
                    this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                    if (this.collider.getIntersection(element.collider) != null) {
                        let newIntersection = this.collider.getIntersection(element.collider);
                        let areaAfterMove = newIntersection.height * newIntersection.width;

                        if (areaBeforeMove < areaAfterMove) {
                            canMoveX = false;
                        }
                    }

                    this.collider.position = oldPosition;
                    newDirection = new Game.ƒ.Vector2(0, _direction.y);
                    this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));

                    if (this.collider.getIntersection(element.collider) != null) {
                        let newIntersection = this.collider.getIntersection(element.collider);
                        let areaAfterMove = newIntersection.height * newIntersection.width;

                        if (areaBeforeMove < areaAfterMove) {
                            canMoveY = false;
                        }
                    }
                    this.collider.position = oldPosition;
                }
            })

            if (canMoveX && canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction, false);
            } else if (canMoveX && !canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction, false);
            } else if (!canMoveX && canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z)
                this.cmpTransform.mtxLocal.translate(_direction, false);
            }
        }

        public attack(_direction: ƒ.Vector3) {
            if (this.weapon.currentAttackCount > 0) {
                _direction.normalize();
                let bullet: Bullets.Bullet = new Bullets.Bullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction);
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);

                this.weapon.currentAttackCount--;
            }
        }

        public cooldown() {
            if (this.weapon.currentAttackCount <= 0) {
                if (this.weapon.currentCooldownTime <= 0) {
                    this.weapon.currentCooldownTime = this.weapon.cooldownTime;
                    this.weapon.currentAttackCount = this.weapon.attackCount;
                } else {
                    // console.log(this.currentCooldownTime);

                    this.weapon.currentCooldownTime--;
                }
            }
        }

        public collector() {

        }

    }

    export class Melee extends Player {
        public attack(_direction: ƒ.Vector3) {
            if (this.weapon.currentAttackCount > 0) {
                _direction.normalize();
                let bullet: Bullets.Bullet = new Bullets.MeleeBullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction);
                bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
                Game.graph.addChild(bullet);

                this.weapon.currentAttackCount--;
            }
        }
    }

    export class Ranged extends Player {

    }
}