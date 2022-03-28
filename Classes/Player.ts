namespace Player {

    export class Player extends Game.ƒAid.NodeSprite {
        public authority: string;
        public items: Array<Items.Item>;
        public hero: Character;
        rect1: ƒ.Rectangle;

        constructor(_name: string, _authority: string, _hero: Character) {
            super(_name);
            this.addComponent(new ƒ.ComponentTransform());
            this.authority = _authority;
            this.hero = _hero;
        }

        public move(_direction: ƒ.Vector3) {
            // if (Networking.client.id == this.authority) {
            _direction.scale((1 / 60 * this.hero.attributes.speed))
            this.cmpTransform.mtxLocal.translate(_direction);
            // }
        }

        public attack(_direction: ƒ.Vector3) {
            _direction.normalize();
            let bullet: Items.Bullet = new Items.Bullet("bullet", this.cmpTransform.mtxLocal.translation,_direction,5,0.5,30);
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