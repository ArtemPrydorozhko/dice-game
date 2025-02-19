export default class DiceCombination {
  constructor(faces) {
    this.faces = faces;
    this.hightFace = null;
    this.lowFace = null;

    this.combinations = {
      fiveOfKind: {
        name: 'Five of a Kind',
        rank: 1,
        check: this.checkFiveOfKind.bind(this),
      },
      fourOfKind: {
        name: 'Four of a Kind',
        rank: 2,
        check: this.checkFourOfKind.bind(this),
      },
      straight: {
        name: 'Straight',
        rank: 3,
        check: this.checkStraight.bind(this),
      },
      fullHouse: {
        name: 'Full House',
        rank: 4,
        check: this.checkFullHouse.bind(this),
      },
      threeOfKind: {
        name: 'Three of a Kind',
        rank: 5,
        check: this.checkThreeOfKind.bind(this),
      },
      twoPair: {
        name: 'Two Pair',
        rank: 6,
        check: this.checkTwoPairs.bind(this),
      },
      pair: { name: 'Pair', rank: 7, check: this.checkPair.bind(this) },
      nothing: { name: 'Nothing', rank: 8, check: () => true },
    };

    this.rank = null;
    this.name = null;
    this.faceRepeats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    this.faces.forEach((f) => this.faceRepeats[f]++);

    this.getCombination();
  }

  static compareCombinations(combination1, combination2) {
    // 1 combo1 wins, -1 combo2 wins, 0 draw
    if (combination1.rank < combination2.rank) {
      return 1;
    }
    if (combination1.rank > combination2.rank) {
      return -1;
    }
    if (combination1.hightFace > combination2.hightFace) {
      return 1;
    }
    if (combination1.hightFace < combination2.hightFace) {
      return -1;
    }
    if (combination1.lowFace > combination2.lowFace) {
      return 1;
    }
    if (combination1.lowFace < combination2.lowFace) {
      return -1;
    }
    return 0;
  }

  getCombination() {
    const combinationsInOrder = Object.values(this.combinations).sort(
      (combo1, combo2) => {
        return combo1.rank - combo2.rank;
      },
    );

    for (const combination of combinationsInOrder) {
      if (combination.check()) {
        this.rank = combination.rank;
        this.name = combination.name;
        break;
      }
    }
  }

  checkStraight() {
    const isLowStraight = Object.entries(this.faceRepeats)
      .filter(([face]) => Number(face) !== 6)
      .every(([_face, repeats]) => repeats === 1);

    if (isLowStraight) {
      this.hightFace = 5;
      return true;
    }

    const isHightStraight = Object.entries(this.faceRepeats)
      .filter(([face]) => Number(face) !== 1)
      .every(([_face, repeats]) => repeats === 1);

    if (isHightStraight) {
      this.hightFace = 6;
      return true;
    }

    return false;
  }

  checkFiveOfKind() {
    const face = this.faces[0];
    const isFiveOfKind = this.faces.every((f) => f === face);
    if (isFiveOfKind) {
      this.hightFace = face;
    }
    return isFiveOfKind;
  }

  checkFourOfKind() {
    const face = Object.entries(this.faceRepeats).find(
      ([_face, repeats]) => repeats === 4,
    )?.[0];

    if (face) {
      this.hightFace = face;
    }

    return !!face;
  }

  checkFullHouse() {
    const threeOfKindFace = Object.entries(this.faceRepeats).find(
      ([_face, repeats]) => repeats === 3,
    )?.[0];

    if (!threeOfKindFace) {
      return false;
    }

    const pairFace = Object.entries(this.faceRepeats).find(
      ([_face, repeats]) => repeats === 2,
    )?.[0];

    if (!pairFace) {
      return false;
    }

    this.hightFace = threeOfKindFace;
    this.lowFace = pairFace;

    return true;
  }

  checkThreeOfKind() {
    const face = Object.entries(this.faceRepeats).find(
      ([_face, repeats]) => repeats === 3,
    )?.[0];

    if (face) {
      this.hightFace = face;
    }

    return !!face;
  }

  checkTwoPairs() {
    const face1 = Object.entries(this.faceRepeats).find(
      ([_face, repeats]) => repeats === 2,
    )?.[0];

    if (!face1) {
      return false;
    }

    const face2 = Object.entries(this.faceRepeats).find(
      ([face, repeats]) => repeats === 2 && face !== face1,
    )?.[0];

    if (!face2) {
      return false;
    }

    this.hightFace = Math.max(face1, face2);
    this.lowFace = Math.min(face1, face2);

    return true;
  }

  checkPair() {
    const face = Object.entries(this.faceRepeats).find(
      ([_face, repeats]) => repeats === 2,
    )?.[0];

    if (face) {
      this.hightFace = face;
    }

    return !!face;
  }
}
