namespace Player {

    export class Player extends Game.ƒAid.NodeSprite {
        public tag: Tag.Tag = Tag.Tag.PLAYER;
        public items: Array<Items.Item> = [];
        public hero: Character;
        collider: ƒ.Rectangle;

        constructor(_name: string, _properties: Character) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.hero = _properties;
        }

        public move(_direction: ƒ.Vector3) {
            _direction.scale((1 / 60 * this.hero.attributes.speed));

            //TODO: don't let the player walk in the wall but don't ignor the movement completely 
            // let colliders: Generation.Wall[] = <Generation.Wall[]>Game.graph.getChildren().find(element => (<Generation.Room>element).tag == Tag.Tag.ROOM).getChildren().filter(element => (<Generation.Wall>element).tag == Tag.Tag.WALL); 
            // colliders.forEach((element) => {
            //     if (this.collider.collides(element.collider)) {
            //         this.collider.getIntersection(element.collider);
            //     }
            // })

            this.cmpTransform.mtxLocal.translate(_direction, false);
        }

        public attack(_direction: ƒ.Vector3) {
            _direction.normalize();
            let bullet: Items.Bullet = new Items.Bullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction);
            bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
            Game.graph.addChild(bullet);
        }

        public collector() {

        }
        /**
         * adds Attributes to the Player Attributes
         * @param _attributes incoming attributes
         */
        public addAttribuesByItem(_item: Items.AttributeItem): void {
            switch (_item.type) {
                case Items.ITEMTYPE.ADD:
                    break; // calculate attributes by adding them
                case Items.ITEMTYPE.SUBSTRACT:
                    break; // calculate attribes by substacting them
                case Items.ITEMTYPE.PROCENTUAL:
                    break; // calculate attributes by giving spefic %
            }
        }
    }
}