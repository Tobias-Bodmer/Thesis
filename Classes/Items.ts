namespace Items {
    export class Item {
        public itemName: string;
        public description: string;

  
        constructor(_itemName: string, _description: string) {
            this.itemName = _itemName;
            this.description = _description;

        }
    }
}