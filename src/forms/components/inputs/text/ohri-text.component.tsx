import React, { useEffect, useState } from 'react';
import { TextInput } from 'carbon-components-react';
import { OHRIFormFieldProps } from '../../../types';
import styles from '../_input.scss';
import { useField } from 'formik';
import { OHRIFormContext } from '../../../ohri-form-context';
import { OHRILabel } from '../../label/ohri-label.component';
import { OHRIValueEmpty, OHRIValueDisplay } from '../../value/ohri-value.component';
import { canBeUnspecifiable, OHRIUnspecified } from '../unspecified/ohri-unspecified.component';
import { validateFieldValue } from '../../../ohri-form-validators';

const OHRIText: React.FC<OHRIFormFieldProps> = ({ question, onChange, handler }) => {
  const [field, meta] = useField(question.id);
  const { setFieldValue, encounterContext } = React.useContext(OHRIFormContext);
  const [previousValue, setPreviousValue] = useState();
  const [fieldError, setFieldError] = useState(null);
  const [unspecified, setUnspecified] = useState(false);
  const [previoulsySpecified, setPrevioulsySpecified] = useState(false);

  useEffect(() => {
    if (unspecified) {
      setPrevioulsySpecified(true);
      setFieldError(null);
      setFieldValue(question.id, null);
      onChange(question.id, null);
      question.value = null;
      question['submission'] = {
        specified: true,
        errors: null,
      };
    } else if (previoulsySpecified) {
      setFieldError(validateFieldValue(field.value, question));
    }
  }, [unspecified]);

  useEffect(() => {
    if (question['submission']?.errors) {
      setFieldError(question['submission']?.errors);
    }
  }, [question['submission']]);

  field.onBlur = () => {
    setFieldError(validateFieldValue(field.value, question));
    if (previousValue !== field.value) {
      onChange(question.id, field.value);
      question.value = handler.handleFieldSubmission(question, field.value, encounterContext);
    }
  };

  return encounterContext.sessionMode == 'view' ? (
    <div className={styles.formField}>
      <OHRILabel value={question.label} />
      {field.value ? <OHRIValueDisplay value={field.value} /> : <OHRIValueEmpty />}
    </div>
  ) : (
    !question.isHidden && (
      <div className={styles.formField}>
        <div className={fieldError ? styles.errorLabel : ''}>
          <TextInput
            {...field}
            id={question.id}
            className={styles.textInputOverrides}
            labelText={question.label}
            name={question.id}
            value={field.value || ''}
            onFocus={() => setPreviousValue(field.value)}
          />
        </div>
        {canBeUnspecifiable(question) && <OHRIUnspecified question={question} setUnspecified={setUnspecified} />}
      </div>
    )
  );
};

export default OHRIText;
