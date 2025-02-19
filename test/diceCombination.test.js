import { describe, it } from 'node:test';
import assert from 'node:assert';

import DiceCombination from '../src/game/behavior/DiceCombination.js';

describe('diceCombination', () => {
  describe('combination identification', () => {
    it('should identify no combination', () => {
      const diceCombination = new DiceCombination([1, 2, 3, 4, 6]);
      assert.strictEqual(diceCombination.rank, 8);
      assert.strictEqual(diceCombination.name, 'Nothing');
    });

    it('should identify "pair" combination', () => {
      const diceCombination = new DiceCombination([1, 1, 2, 3, 4]);
      assert.strictEqual(diceCombination.rank, 7);
      assert.strictEqual(diceCombination.name, 'Pair');
    });

    it('should identify "two pair" combination', () => {
      const diceCombination = new DiceCombination([1, 1, 2, 4, 4]);
      assert.strictEqual(diceCombination.rank, 6);
      assert.strictEqual(diceCombination.name, 'Two Pair');
    });

    it('should identify "three of a kind" combination', () => {
      const diceCombination = new DiceCombination([2, 2, 2, 3, 4]);
      assert.strictEqual(diceCombination.rank, 5);
      assert.strictEqual(diceCombination.name, 'Three of a Kind');
    });

    it('should identify "full house" combination', () => {
      const diceCombination = new DiceCombination([2, 2, 2, 5, 5]);
      assert.strictEqual(diceCombination.rank, 4);
      assert.strictEqual(diceCombination.name, 'Full House');
    });

    it('should identify "straight" combination', () => {
      const diceCombination = new DiceCombination([1, 2, 3, 4, 5]);
      assert.strictEqual(diceCombination.rank, 3);
      assert.strictEqual(diceCombination.name, 'Straight');
    });

    it('should identify "four of a kind" combination', () => {
      const diceCombination = new DiceCombination([5, 5, 5, 4, 5]);
      assert.strictEqual(diceCombination.rank, 2);
      assert.strictEqual(diceCombination.name, 'Four of a Kind');
    });

    it('should identify "five of a kind" combination', () => {
      const diceCombination = new DiceCombination([6, 6, 6, 6, 6]);
      assert.strictEqual(diceCombination.rank, 1);
      assert.strictEqual(diceCombination.name, 'Five of a Kind');
    });
  });

  describe('combination comparison', () => {
    it('highter face should win in same kind of combination', () => {
      const combination1 = new DiceCombination([6, 6, 6, 6, 6]);
      const combination2 = new DiceCombination([5, 5, 5, 5, 5]);
      assert.strictEqual(
        DiceCombination.compareCombinations(combination1, combination2),
        1,
      );
      assert.strictEqual(
        DiceCombination.compareCombinations(combination2, combination1),
        -1,
      );
    });
    it('"five of a kind" should beat "four of a kind', () => {
      const combination1 = new DiceCombination([6, 6, 6, 6, 6]);
      const combination2 = new DiceCombination([5, 5, 5, 5, 1]);
      assert.strictEqual(
        DiceCombination.compareCombinations(combination1, combination2),
        1,
      );
      assert.strictEqual(
        DiceCombination.compareCombinations(combination2, combination1),
        -1,
      );
    });
    it('"four of a kind" should beat "straight"', () => {
      const combination1 = new DiceCombination([6, 6, 6, 6, 2]);
      const combination2 = new DiceCombination([2, 3, 4, 5, 6]);
      assert.strictEqual(
        DiceCombination.compareCombinations(combination1, combination2),
        1,
      );
      assert.strictEqual(
        DiceCombination.compareCombinations(combination2, combination1),
        -1,
      );
    });
    it('"straight" should beat "full house"', () => {
      const combination1 = new DiceCombination([2, 3, 4, 5, 6]);
      const combination2 = new DiceCombination([3, 3, 3, 1, 1]);
      assert.strictEqual(
        DiceCombination.compareCombinations(combination1, combination2),
        1,
      );
      assert.strictEqual(
        DiceCombination.compareCombinations(combination2, combination1),
        -1,
      );
    });
    it('"full house" should beat "three of a kind"', () => {
      const combination1 = new DiceCombination([3, 3, 3, 1, 1]);
      const combination2 = new DiceCombination([4, 4, 4, 5, 6]);
      assert.strictEqual(
        DiceCombination.compareCombinations(combination1, combination2),
        1,
      );
      assert.strictEqual(
        DiceCombination.compareCombinations(combination2, combination1),
        -1,
      );
    });
    it('"three of a kind" should beat "two pair"', () => {
      const combination1 = new DiceCombination([4, 4, 4, 5, 6]);
      const combination2 = new DiceCombination([3, 3, 6, 1, 1]);
      assert.strictEqual(
        DiceCombination.compareCombinations(combination1, combination2),
        1,
      );
      assert.strictEqual(
        DiceCombination.compareCombinations(combination2, combination1),
        -1,
      );
    });
    it('"two pair" should beat "pair"', () => {
      const combination1 = new DiceCombination([3, 3, 6, 1, 1]);
      const combination2 = new DiceCombination([4, 4, 1, 5, 6]);
      assert.strictEqual(
        DiceCombination.compareCombinations(combination1, combination2),
        1,
      );
      assert.strictEqual(
        DiceCombination.compareCombinations(combination2, combination1),
        -1,
      );
    });
    it('"pair" should beat no combination', () => {
      const combination1 = new DiceCombination([4, 4, 1, 5, 6]);
      const combination2 = new DiceCombination([3, 5, 6, 2, 1]);
      assert.strictEqual(
        DiceCombination.compareCombinations(combination1, combination2),
        1,
      );
      assert.strictEqual(
        DiceCombination.compareCombinations(combination2, combination1),
        -1,
      );
    });

    it('should draw if both combinations are the same', () => {
      const combination1 = new DiceCombination([4, 4, 1, 5, 6]);
      const combination2 = new DiceCombination([4, 4, 2, 5, 3]);
      assert.strictEqual(
        DiceCombination.compareCombinations(combination1, combination2),
        0,
      );
    });
  });
});
