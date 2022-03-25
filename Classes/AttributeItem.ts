namespace Items {

    export enum ITEMTYPE {
        ADD,
        SUBSTRACT,
        PROCENTUAL
    }
    export class AttributeItem extends Item {
        public type: ITEMTYPE;
        public attributes: Player.Attributes;
        /**
         * Creates an item that can change Attributes of the player
         * @param _name name of the Item
         * @param _description Descirption of the item
         * @param _position Position where to spawn
         * @param _lifetime optional: how long is the item visible
         * @param _attributes define which attributes will change, compare with {@link Player.Attributes}
         */
        constructor(_name: string, _description: string, _position: ƒ.Vector3, _lifetime: number, _attributes: Player.Attributes, _type: ITEMTYPE) {
            super(_name, _description, _position, _lifetime);
            this.attributes = _attributes;
            this.type = _type;
        }
    }
}