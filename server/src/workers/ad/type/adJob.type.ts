import { PostAdJobInterface } from '../interface/postAd.job.interface';
import { UpdateAdJobInterface } from '../interface/updateAd.job.interface';
import { DeleteAdJobInterface } from '../interface/deleteAd.job.interface';

export type AdJob = PostAdJobInterface | UpdateAdJobInterface | DeleteAdJobInterface;