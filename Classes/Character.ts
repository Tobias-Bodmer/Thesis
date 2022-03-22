namespace Player {

    export class Character {
        public name: string;
        public attributes: Attributes;

        constructor(name: string, attributes: Attributes) {
            this.name = name;
            this.attributes = attributes;
        }
    }
}