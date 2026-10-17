import numpy as np, sys
B = 'root,hips,spine,spine1,chest,neck,head,ear_L,ear_R,clavicle_L,upper_arm_L,forearm_L,forearm_twist_L,hand_L,fingers_L,clavicle_R,upper_arm_R,forearm_R,forearm_twist_R,hand_R,fingers_R,thigh_L,shin_L,foot_L,toes_L,thigh_R,shin_R,foot_R,toes_R,tail,tail_tip'.split(',')
for pre in sys.argv[1:]:
    bind = np.load(pre + '-bind.npy'); w = np.load(pre + '-weights.npy')
    lower = [B.index(f'{b}_{s}') for b in ('shin','foot','toes') for s in 'LR']
    tail = w[:, [B.index('tail'), B.index('tail_tip')]].sum(1)
    hang = w[:, lower].sum(1)
    seat = (np.abs(bind[:,0]) <= 0.17) & (bind[:,2] >= -0.087) & (bind[:,2] <= 0.1) & (hang <= 0.5) & (tail <= 0.5)
    ids = np.nonzero(seat)[0]
    order = ids[np.argsort(bind[ids,1])][:6]
    print(pre.split('/')[-1], [(int(i), round(float(bind[i,1]),4), round(float(tail[i]),2), np.round(bind[i],3).tolist()) for i in order])
