namespace Player {
    export class Attributes {

        public healthPoints: number;
        maxHealthPoints: number;
        knockbackForce: number = 6;
        public speed: number;
        public attackPoints: number;
        public coolDownReduction: number = 1;
        public scale: number;


        constructor(_healthPoints: number, _attackPoints: number, _speed: number, _scale: number, _cooldownReduction?: number) {
            this.scale = _scale;
            this.healthPoints = _healthPoints * this.scale;
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = _attackPoints * this.scale;
            this.speed = _speed / this.scale;
            if (_cooldownReduction != undefined) {
                this.coolDownReduction = _cooldownReduction;
            }
        }

        /**
         * adds Attributes to the Player Attributes
         * @param _attributes incoming attributes
         */
        public addAttribuesByItem(_attributes: Player.Attributes, _itemType: Items.ITEMTYPE): void {
            switch (_itemType) {
                case Items.ITEMTYPE.ADD:
                    this.healthPoints += _attributes.healthPoints;
                    this.maxHealthPoints += _attributes.maxHealthPoints;
                    this.speed += _attributes.speed;
                    this.attackPoints += _attributes.attackPoints;
                    break; // calculate attributes by adding them
                case Items.ITEMTYPE.SUBSTRACT:
                    this.healthPoints -= _attributes.healthPoints;
                    this.maxHealthPoints -= _attributes.maxHealthPoints;
                    this.speed -= _attributes.speed;
                    this.attackPoints -= _attributes.attackPoints;
                    break; // calculate attribes by substacting them
                case Items.ITEMTYPE.PROCENTUAL:
                    this.healthPoints = this.healthPoints * ((100 + _attributes.healthPoints) / 100);
                    this.attackPoints = this.attackPoints * ((100 + _attributes.attackPoints) / 100);
                    this.speed = this.speed * ((100 + _attributes.speed) / 100);
                    console.log(this.coolDownReduction);
                    this.coolDownReduction = this.coolDownReduction * Math.fround((100 / (100 + _attributes.coolDownReduction)));
                    console.log(this.coolDownReduction);
                    break; // calculate attributes by giving spefic %
            }
        }
    }
}