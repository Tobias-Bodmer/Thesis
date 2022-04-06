namespace Player {

    export class Character {
        public name: string;
        public attributes: Attributes;
        

        constructor(_name: string, _attributes: Attributes) {
            this.name = _name;
            this.attributes = _attributes;
        }
    }
}