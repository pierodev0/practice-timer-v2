export class StatService {
  constructor({ exerciseLogRepository }) {
    this._exerciseLogRepository = exerciseLogRepository;
  }

  async addStatLog(exerciseId, date, statValue) {
    return this._exerciseLogRepository.addLog(exerciseId, { date, value: statValue });
  }

  async updateStatLog(logId, data) {
    await this._exerciseLogRepository.update(logId, data);
  }

  async deleteStatLog(logId) {
    await this._exerciseLogRepository.remove(logId);
  }
}
