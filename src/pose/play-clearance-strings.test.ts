import { describePlayClearance } from './test-play-clearance.ts';

// The contrabass is not in the list: at the tip of a down-bow on its low strings, the bow hand of
// the hippo goes up to 0.25 H into its belly (design 5.3). The violin is not in the list: the user
// removed it when the rigged rabbit of 2026-10-10 failed it, and it stays out since the parametric
// rabbit came back (`docs/decisions/2026-10-11-body-revert.md`).
describePlayClearance(['viola', 'cello']);
