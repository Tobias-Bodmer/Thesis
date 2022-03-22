namespace Items {
    export class Item {
        public itemName: string;
        public description: string;

        /**
 * Creates new Item
 * @param _itemName name of the item
 * @param _description description of the item
 */
        constructor(_itemName: string, _description: string) {
            this.itemName = _itemName;
            this.description = _description;
        }
    }
}