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

        public attack() {

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