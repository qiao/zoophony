import { describePlayClearance } from './test-play-clearance.ts';

// The contrabass is not in the list: at the tip of a down-bow on its low strings, the bow hand of
// the hippo goes up to 0.25 H into its belly (design 5.3). The violin is not in the list since the
// rabbit has its rigged body (design 4.4): the user removed the checks that it fails.
describePlayClearance(['viola', 'cello']);
