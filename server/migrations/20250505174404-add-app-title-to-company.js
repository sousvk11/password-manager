'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('companies', 'appTitle', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'Password Manager'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('companies', 'appTitle');
  }
};
