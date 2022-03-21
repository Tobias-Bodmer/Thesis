namespace Items {
    export class Item {
        public itemName: string;
        public description: string;

        /**
 * Creates new Item
 * @param iName name of the item
 * @param iDesc description of the item
 */
        constructor(iName: string, iDesc: string) {
            this.itemName = iName;
            this.description = iDesc;


        }
    }
}