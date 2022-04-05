namespace Player {
    export class Attributes {

        public healthPoints: number;
        public maxhealthPoints: number;
        public speed: number;
        public attackPoints: number;
        cooldownTime: number = 10;
        public currentCooldownTime: number = this.cooldownTime;
        attackCount: number = 1;
        public currentAttackCount: number = this.attackCount;

        constructor(_healthPoints: number, _attackPoints: number, _speed: number) {
            this.healthPoints = _healthPoints;
            this.maxhealthPoints = _healthPoints;
            this.attackPoints = _attackPoints;
            this.speed = _speed;
        }

        /**
         * adds Attributes to the Player Attributes
         * @param _attributes incoming attributes
         */
        public addAttribuesByItem(_attributes: Player.Attributes, _itemType: Items.ITEMTYPE): void {
            switch (_itemType) {
                case Items.ITEMTYPE.ADD:
                    this.healthPoints += _attributes.healthPoints;
                    this.maxhealthPoints += _attributes.maxhealthPoints;
                    this.speed += _attributes.speed;
                    this.attackPoints += _attributes.attackPoints;
                    break; // calculate attributes by adding them
                case Items.ITEMTYPE.SUBSTRACT:
                    break; // calculate attribes by substacting them
                case Items.ITEMTYPE.PROCENTUAL:
                    break; // calculate attributes by giving spefic %
            }
        }
    }
}