import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import studentsRouter from "./students";
import expensesRouter from "./expenses";
import budgetsRouter from "./budgets";
import mealsRouter from "./meals";
import studentAnalyticsRouter from "./studentAnalytics";
import ownersRouter from "./owners";
import customersRouter from "./customers";
import mealPlansRouter from "./mealPlans";
import attendanceRouter from "./attendance";
import billingRouter from "./billing";
import paymentsRouter from "./payments";
import ownerAnalyticsRouter from "./ownerAnalytics";
import notificationsRouter from "./notifications";
import connectionsRouter from "./connections";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(studentsRouter);
router.use(expensesRouter);
router.use(budgetsRouter);
router.use(mealsRouter);
router.use(studentAnalyticsRouter);
router.use(ownersRouter);
router.use(customersRouter);
router.use(mealPlansRouter);
router.use(attendanceRouter);
router.use(billingRouter);
router.use(paymentsRouter);
router.use(ownerAnalyticsRouter);
router.use(notificationsRouter);
router.use(connectionsRouter);

export default router;
