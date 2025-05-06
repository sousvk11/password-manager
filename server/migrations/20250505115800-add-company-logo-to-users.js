'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'companyLogo', {
      type: Sequelize.BLOB('long'),
      allowNull: true,
      after: 'profilePicture'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'companyLogo');
  }
};
