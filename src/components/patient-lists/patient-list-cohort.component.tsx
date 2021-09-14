import { age, attach, detach, ExtensionSlot, navigate } from '@openmrs/esm-framework';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPatientsFinalHIVStatus, getCohort } from '../../api/api';
import moment from 'moment';
import TableEmptyState from '../empty-state/table-empty-state.component';
import { getForm, filterFormByIntent } from '../../utils/forms-loader';
import { InlineLoading, OverflowMenu, OverflowMenuItem } from 'carbon-components-react';
import AddPatientToListOverflowMenuItem from '../modals/patient-list/add-patient-to-list-modal.component';
import { launchForm } from '../../utils/ohri-forms-commons';
import {
  basePath,
  waitingForHIVTestCohort,
  postTestCounsellingCohort,
  preTestCounsellingCohort,
} from '../../constants';

export const columns = [
  {
    key: 'name',
    header: 'Name',
    getValue: patient => {
      return patient.name;
    },
    link: {
      getUrl: patient => `${basePath}${patient.uuid}/chart`,
    },
  },
  {
    key: 'timeAddedToList',
    header: 'Time Added To List',
    getValue: patient => {
      return patient.timeAddedToList;
    },
  },
  {
    key: 'waitingTime',
    header: 'Waiting Time',
    getValue: patient => {
      return patient.waitingTime;
    },
  },
  {
    key: 'gender',
    header: 'Sex',
    getValue: patient => {
      return patient.gender;
    },
  },
  {
    key: 'location', // exclude from pretest
    header: 'Location',
    getValue: patient => {
      return patient.location;
    },
  },
  {
    key: 'age',
    header: 'Age',
    getValue: patient => {
      return patient.age;
    },
  },
  {
    key: 'phoneNumber',
    header: 'Phone Number',
    getValue: patient => {
      return patient.phoneNumber;
    },
  },
  {
    key: 'hivResult', // only post test counselling
    header: 'HIV Result',
    getValue: patient => {
      return patient.hivResult;
    },
  },
  {
    key: 'actions',
    header: '',
    getValue: patient => {
      return patient.actions;
    },
  },
];

const filterPatientsByName = (searchTerm: string, patients: Array<any>) => {
  return patients.filter(patient => patient.name.toLowerCase().search(searchTerm.toLowerCase()) !== -1);
};

const CohortPatientList: React.FC<{ cohortId: string; cohortSlotName: string; launchFormWorkSpace: any }> = ({
  cohortId,
  cohortSlotName,
  launchFormWorkSpace,
}) => {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [patientsCount, setPatientsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState(null);
  const [counter, setCounter] = useState(0);
  const [filteredResults, setFilteredResults] = useState([]);

  const htsForm = getForm('hiv', 'hts');

  const getFormTitle = () => {
    if (cohortId === preTestCounsellingCohort) {
      return 'Pre-test Counselling';
    } else if (cohortId === waitingForHIVTestCohort) {
      return 'HIV Testing';
    } else if (cohortId === postTestCounsellingCohort) {
      return 'Post-test Counselling';
    }
  };

  const getFormIntent = () => {
    if (cohortId === preTestCounsellingCohort) {
      return 'HTS_PRETEST';
    } else if (cohortId === waitingForHIVTestCohort) {
      return 'HIV_TEST';
    } else if (cohortId === postTestCounsellingCohort) {
      return 'HTS_POSTTEST';
    }
  };

  const patientFormTitle = getFormTitle();
  const patientFormIntent = getFormIntent(); 
    
  useEffect(() => {
    setIsLoading(true);
    getCohort(cohortId, 'full').then(results => {
      const fullPatientList = results.cohortMembers.map(member => ({
        uuid: member.patient.uuid,
        id: member.patient.identifiers[0].identifier,
        age: member.patient.person.age,
        name: member.patient.person.display,
        gender: member.patient.person.gender == 'M' ? 'Male' : 'Female',
        birthday: member.patient.person.birthdate,
        timeAddedToList: moment(member.startDate).format('LL'),
        startDate: member.startDate,
        waitingTime: moment(member.startDate).fromNow(),
        location: results.location.name,
        phoneNumber: '0700xxxxxx',
        hivResult: '',
        actions: (
          <OverflowMenu flipped>
            <AddPatientToListOverflowMenuItem patientUuid={member.patient.uuid} />
            <OverflowMenuItem
              itemText="Continue"
              onClick={() => {
                launchFormWorkSpace(
                  patientFormTitle,
                  <OHRIForm
                    formJson={filterFormByIntent(patientFormIntent, htsForm)}
                    patientUUID={member.patient.uuid}
                    mode="enter"
                  />,
                );
              }}
            />
          </OverflowMenu>
        ),
      }));

      // fliter today's patients
      const todaysPatientList = fullPatientList.filter(patient => moment().diff(moment(patient.startDate), 'days') < 1);

      setTodaysPatients(todaysPatientList);
      setAllPatients(fullPatientList);

      // By default, display today's patient list
      setPatients(todaysPatients);
      setPatientsCount(todaysPatients.length);

      setIsLoading(false);
    });
  }, [cohortId, counter]);

  useEffect(() => {
    (async function() {
      patients.map(async patient => {
        const hivResult = await fetchPatientsFinalHIVStatus(patient.uuid);
        return (patient['hivResult'] = hivResult);
      });
    })();
  }, [patients]);

  const pagination = useMemo(() => {
    return {
      usePagination: true,
      currentPage: currentPage,
      onChange: ({ pageSize, page }) => {
        setCurrentPage(page);
        setPageSize(pageSize);
        return null;
      },
      pageSize: pageSize,
      totalItems: patientsCount,
    };
  }, [currentPage, pageSize, patientsCount]);

  const handleSearch = useCallback(
    searchTerm => {
      setSearchTerm(searchTerm);
      const filtrate = filterPatientsByName(searchTerm, patients);
      setFilteredResults(filtrate);
      return true;
    },
    [patients],
  );

  useEffect(() => {
    attach(cohortSlotName, 'patient-table');
    return () => {
      detach(cohortSlotName, 'patient-table');
    };
  });

  const handleEncounterDateGroupChange = newSelection => {
    setIsLoading(true);

    if (newSelection === 'today') {
      setPatients(todaysPatients);
      setPatientsCount(todaysPatients.length);
      setDateFilter('today');
    } else {
      setPatients(allPatients);
      setPatientsCount(allPatients.length);
      setDateFilter('all');
    }
  };

  const state = useMemo(
    () => ({
      patients: searchTerm ? filteredResults : patients,
      columns,
      isLoading,
      search: { placeHolder: 'Search client list', onSearch: handleSearch, currentSearchTerm: searchTerm },
      pagination: pagination,
      autoFocus: true,
    }),
    [searchTerm, filteredResults, patients, handleSearch, pagination, isLoading],
  );

  return (
    <div>
      {isLoading ? (
        <InlineLoading style={{ margin: '20px auto', minWidth: '80px' }} description="Loading..." />
      ) : !patients.length ? (
        <TableEmptyState tableHeaders={columns} message="There are no patients in this list." />
      ) : (
        <>
          <ExtensionSlot extensionSlotName={cohortSlotName} state={state} key={counter} />
        </>
      )}
    </div>
  );
};

export default CohortPatientList;
