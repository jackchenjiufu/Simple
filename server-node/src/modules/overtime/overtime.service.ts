import { Injectable } from '@nestjs/common';
import { db } from '../../config/db';
import { ok, fail } from '../../common/response';
import { AuthService, HttpFail, toInt, fmtDatetime } from '../auth/auth.service';

@Injectable()
export class OvertimeService {
  constructor(private readonly auth: AuthService) {}

  /** 兼容旧表：salary_config 加 month 列、overtime 加 type 列 */
  private async ensureSchema() {
    try {
      const [cols] = await db.query("SHOW COLUMNS FROM salary_config LIKE 'month'");
      if (!(cols as unknown[]).length) {
        await db.query(
          "ALTER TABLE salary_config ADD COLUMN month VARCHAR(7) NOT NULL DEFAULT '' COMMENT '月份 YYYY-MM' AFTER user_id, ADD UNIQUE KEY uk_user_month (user_id, month)",
        ).catch(() => {});
        await db.query('ALTER TABLE salary_config DROP INDEX user_id').catch(() => {});
      }
    } catch { /* 表可能不存在 */ }
    try {
      const [cols] = await db.query("SHOW COLUMNS FROM overtime LIKE 'type'");
      if (!(cols as unknown[]).length) {
        await db.query("ALTER TABLE overtime ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'overtime' COMMENT 'overtime=加班费, comp=调休' AFTER note").catch(() => {});
      }
    } catch { /* 表可能不存在 */ }
  }

  /** 统一入口：GET 查列表 / POST 添加 / PUT 更新/薪资 / DELETE 删除 */
  async handle(
    method: string,
    query: Record<string, string | undefined>,
    body: Record<string, unknown>,
    headers: Record<string, string | undefined>,
  ) {
    const userId = await this.auth.authenticate(headers);
    if (userId <= 0) return new HttpFail(401, '请先登录');
    await this.ensureSchema();

    const month = query?.month || new Date().toISOString().slice(0, 7);
    const str = (v: unknown, d = '') => (v != null ? String(v) : d);
    const fl = (v: unknown, d = 0) => {
      const n = parseFloat(str(v));
      return isNaN(n) ? d : n;
    };

    // DEBUG: 列出全部（仅 admin id=3）
    if (method === 'GET' && query?.debug === 'all' && userId === 3) {
      const [rows] = await db.query('SELECT o.*, u.username FROM overtime o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.user_id, o.date');
      return { code: 200, data: rows };
    }

    // ====== PUT update_overtime 编辑 ======
    if (method === 'PUT' && body?.action === 'update_overtime') {
      const id = toInt(body.id);
      const date = str(body.date);
      const hours = fl(body.hours);
      const rate = fl(body.rate);
      const multiplier = fl(body.multiplier, 1.5);
      const note = str(body.note);
      const type = str(body.type, 'overtime');
      if (!id || !date || hours <= 0 || rate <= 0) return new HttpFail(400, '参数不完整');
      const salary = Math.round(hours * rate * multiplier * 100) / 100;
      await db.query(
        'UPDATE overtime SET date=?, hours=?, rate=?, multiplier=?, salary=?, note=?, type=? WHERE id=? AND user_id=?',
        [date, hours, rate, multiplier, salary, note, type, id, userId],
      );
      return ok('更新成功', { salary });
    }

    // ====== PUT save_salary 薪资配置 ======
    if (method === 'PUT' && body?.action === 'save_salary') {
      const sMonth = str(body.month, month);
      await db.query(
        `INSERT INTO salary_config (user_id, month, base_salary, position_salary, seniority_allowance, bonus, performance_score, performance_rate, overtime_rate, social_insurance, si_pension, si_medical, si_unemployment, si_housing, si_base)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE base_salary=VALUES(base_salary), position_salary=VALUES(position_salary), seniority_allowance=VALUES(seniority_allowance), bonus=VALUES(bonus), performance_score=VALUES(performance_score), performance_rate=VALUES(performance_rate), overtime_rate=VALUES(overtime_rate), social_insurance=VALUES(social_insurance), si_pension=VALUES(si_pension), si_medical=VALUES(si_medical), si_unemployment=VALUES(si_unemployment), si_housing=VALUES(si_housing), si_base=VALUES(si_base)`,
        [
          userId, sMonth,
          fl(body.base_salary), fl(body.position_salary), fl(body.seniority_allowance),
          fl(body.bonus), fl(body.performance_score), fl(body.performance_rate, 1.0),
          fl(body.overtime_rate, 30), toInt(body.social_insurance ?? 1),
          fl(body.si_pension, 8), fl(body.si_medical, 2), fl(body.si_unemployment, 0.5),
          fl(body.si_housing, 8), fl(body.si_base, 5000),
        ],
      );
      return ok('薪资配置保存成功');
    }

    // ====== 获取薪资配置（月查→回退最新） ======
    const [scRows] = await db.query('SELECT * FROM salary_config WHERE user_id = ? AND month = ?', [userId, month]);
    let salaryConfig = (scRows as Array<Record<string, unknown>>)[0] || null;
    if (!salaryConfig) {
      const [latest] = await db.query('SELECT * FROM salary_config WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1', [userId]);
      salaryConfig = (latest as Array<Record<string, unknown>>)[0] || null;
    }

    // ====== GET ======
    if (method === 'GET') {
      const [rows] = await db.query(
        "SELECT id, date, hours, rate, multiplier, salary, note, type FROM overtime WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = ? ORDER BY date DESC",
        [userId, month],
      );
      const records = (rows as Array<Record<string, unknown>>).map((r) => ({
        id: toInt(r.id),
        date: r.date,
        hours: fl(r.hours),
        rate: fl(r.rate),
        multiplier: fl(r.multiplier),
        salary: fl(r.salary),
        note: r.note,
        type: r.type,
      }));

      let totalHours = 0, totalSalary = 0, compHours = 0;
      const overtimeDates: Record<string, boolean> = {};
      for (const r of records) {
        if (r.type === 'comp') compHours += fl(r.hours);
        else { totalHours += fl(r.hours); totalSalary += fl(r.salary); }
        if (r.type !== 'comp') overtimeDates[String(r.date)] = true;
      }
      const totalDays = Object.keys(overtimeDates).length;

      const [compRows] = await db.query(
        "SELECT COALESCE(SUM(hours), 0) AS total FROM overtime WHERE user_id = ? AND type = 'comp' AND DATE_FORMAT(date, '%Y-%m') = ?",
        [userId, month],
      );
      const compBalance = fl((compRows as Array<{ total: number | string }>)[0].total);

      // 薪资计算
      const baseSalary = fl(salaryConfig?.base_salary);
      const positionSalary = fl(salaryConfig?.position_salary);
      const seniorityAllowance = fl(salaryConfig?.seniority_allowance);
      const bonus = fl(salaryConfig?.bonus);
      const perfScore = fl(salaryConfig?.performance_score);
      const perfRate = fl(salaryConfig?.performance_rate, 1.0);
      const perfPay = perfScore * perfRate;
      let socialDeduction = 0, pensionDeduction = 0, medicalDeduction = 0, unemploymentDeduction = 0, housingDeduction = 0;
      if (salaryConfig && toInt(salaryConfig.social_insurance ?? 1) === 1) {
        const pensionRate = fl(salaryConfig.si_pension, 8) / 100;
        const medicalRate = fl(salaryConfig.si_medical, 2) / 100;
        const unempRate = fl(salaryConfig.si_unemployment, 0.5) / 100;
        const housingRate = fl(salaryConfig.si_housing, 8) / 100;
        const siBase = fl(salaryConfig.si_base, baseSalary);
        pensionDeduction = Math.round(siBase * pensionRate * 100) / 100;
        medicalDeduction = Math.round(siBase * medicalRate * 100) / 100;
        unemploymentDeduction = Math.round(siBase * unempRate * 100) / 100;
        housingDeduction = Math.round(siBase * housingRate * 100) / 100;
        socialDeduction = pensionDeduction + medicalDeduction + unemploymentDeduction + housingDeduction;
      }
      const taxableIncome = baseSalary + positionSalary + seniorityAllowance + bonus + perfPay + totalSalary - socialDeduction - 5000;
      let tax = 0;
      if (taxableIncome > 0) {
        if (taxableIncome <= 3000) tax = taxableIncome * 0.03;
        else if (taxableIncome <= 12000) tax = taxableIncome * 0.1 - 210;
        else if (taxableIncome <= 25000) tax = taxableIncome * 0.2 - 1410;
        else if (taxableIncome <= 35000) tax = taxableIncome * 0.25 - 2660;
        else if (taxableIncome <= 55000) tax = taxableIncome * 0.3 - 4410;
        else if (taxableIncome <= 80000) tax = taxableIncome * 0.35 - 7160;
        else tax = taxableIncome * 0.45 - 15160;
        tax = Math.max(0, Math.round(tax * 100) / 100);
      }
      const totalPay = baseSalary + positionSalary + seniorityAllowance + bonus + perfPay + totalSalary - socialDeduction - tax;

      const [cfgRows] = await db.query('SELECT normal_rate, weekend_rate, holiday_rate FROM overtime_config WHERE user_id = ?', [userId]);
      const config = (cfgRows as Array<Record<string, unknown>>)[0];

      const nf = (n: number, d: number) => (n || 0).toFixed(d);
      return {
        code: 200,
        data: {
          records,
          total_days: totalDays,
          total_hours: nf(totalHours, 1),
          total_overtime_salary: nf(totalSalary, 2),
          compHours: nf(compHours, 1),
          compBalance: nf(compBalance, 1),
          salary_config: salaryConfig ? {
            base_salary: baseSalary,
            position_salary: positionSalary,
            seniority_allowance: seniorityAllowance,
            bonus,
            performance_score: perfScore,
            performance_rate: perfRate,
            performance_pay: Math.round(perfPay * 100) / 100,
            overtime_rate: fl(salaryConfig.overtime_rate, 30),
            social_insurance: toInt(salaryConfig.social_insurance ?? 1),
            si_base: fl(salaryConfig.si_base, baseSalary),
            si_config: {
              pension: fl(salaryConfig.si_pension, 8),
              medical: fl(salaryConfig.si_medical, 2),
              unemployment: fl(salaryConfig.si_unemployment, 0.5),
              housing: fl(salaryConfig.si_housing, 8),
            },
            social_deduction: Math.round(socialDeduction * 100) / 100,
            pension_deduction: Math.round(pensionDeduction * 100) / 100,
            medical_deduction: Math.round(medicalDeduction * 100) / 100,
            unemployment_deduction: Math.round(unemploymentDeduction * 100) / 100,
            housing_deduction: Math.round(housingDeduction * 100) / 100,
            taxable_income: Math.round(Math.max(0, taxableIncome) * 100) / 100,
            tax,
            total_pay: Math.round(totalPay * 100) / 100,
          } : null,
          rate_config: config
            ? { normal: fl(config.normal_rate), weekend: fl(config.weekend_rate), holiday: fl(config.holiday_rate) }
            : { normal: 1.5, weekend: 2.0, holiday: 3.0 },
        },
      };
    }

    // ====== POST 添加 ======
    if (method === 'POST') {
      const date = str(body.date);
      const hours = fl(body.hours);
      const rate = fl(body.rate);
      const multiplier = fl(body.multiplier, 1.5);
      const note = str(body.note);
      const type = str(body.type, 'overtime');
      if (!userId || !date || hours <= 0 || rate <= 0) return new HttpFail(400, '参数不完整');
      const salary = Math.round(hours * rate * multiplier * 100) / 100;
      await db.query(
        'INSERT INTO overtime (user_id, date, hours, rate, multiplier, salary, note, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, date, hours, rate, multiplier, salary, note, type],
      );
      return ok('添加成功', { salary });
    }

    // ====== DELETE ======
    if (method === 'DELETE') {
      const id = toInt(body?.id ?? query?.id);
      const uid = toInt(body?.user_id ?? query?.user_id);
      if (!id || !uid) return new HttpFail(400, '参数错误');
      await db.query('DELETE FROM overtime WHERE id = ? AND user_id = ?', [id, uid]);
      return ok('删除成功');
    }

    return new HttpFail(405, '方法不允许');
  }
}