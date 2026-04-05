import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects/index";
import questionsRouter from "./questions/index";
import outlineRouter from "./outline/index";
import authRouter from "./auth/index";
import adminRouter from "./admin/index";
import stripeRouter from "./stripe/index";
import accountRouter from "./account/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(accountRouter);
router.use(adminRouter);
router.use(stripeRouter);
router.use(projectsRouter);
router.use(questionsRouter);
router.use(outlineRouter);

export default router;
