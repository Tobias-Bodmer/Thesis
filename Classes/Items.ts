namespace Items {
    export class Item {
        public description: string;
        public name: string;


        constructor(_name: string, _description: string) {
            this.name = _name;
            this.description = _description;
        }
    }
}