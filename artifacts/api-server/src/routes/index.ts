import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects/index";
import questionsRouter from "./questions/index";
import outlineRouter from "./outline/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(questionsRouter);
router.use(outlineRouter);

export default router;
